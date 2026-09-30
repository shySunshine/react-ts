import { Action, Dispatch, Dispatcher, ReactContext } from '@react-ts/shared';
import { FiberNode } from './fiber';
import { Lane, NoLane, requestUpdateLane, isSubsetOfLanes, TransitionLane1, mergeLanes } from './fiberLane';
import { Passive, Layout, Flags } from './fiberFlags';
import { currentDispatcher, ReactCurrentBatchConfig } from '@react-ts/react';
import { scheduleUpdateOnFiber } from './workLoop';
import { readContext } from './fiberContext';
import {
  Update,
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  mergeUpdateQueues,
  processUpdateQueue
} from './updateQueue';

/**
 * 挂载在函数组件 Fiber 上的单个 Hook 节点结构 (单向链表)
 */
export interface Hook {
  /** 当前 Hook 记忆化的状态值（如 useState 的 state，或 useMemo 的 [value, deps]） */
  memoizedState: any;
  /** 下次计算状态的基础 State（有更新跳过时冻结） */
  baseState: any;
  /** 保留未消费的 Update 链表 */
  baseQueue: Update<any> | null;
  /** 环形更新队列 */
  queue: UpdateQueue<any> | null;
  /** 指向组件中调用的下一个 Hook 节点 */
  next: Hook | null;
}

/**
 * 副作用对象结构 (Effect)
 * 用于 `useEffect` 与 `useLayoutEffect`
 */
export interface Effect {
  /** 副作用类型标记（Passive 或 Layout） */
  tag: Flags;
  /** 副作用回调函数，可返回销毁函数 */
  create: () => (() => void) | void;
  /** 上一次执行产生的销毁函数 */
  destroy: (() => void) | void;
  /** 依赖项数组 */
  deps: any[] | null;
  /** 指向环形 Effect 链表中的下一个 Effect */
  next: Effect | null;
}

/**
 * 函数组件的更新队列，保存所有待提交的副作用环形链表
 */
export interface FunctionComponentUpdateQueue {
  lastEffect: Effect | null;
}

/** 当前正在渲染的函数组件 FiberNode 指针 */
let currentlyRenderingFiber: FiberNode | null = null;
/** 当前正在构建的 WIP Hook 节点指针 */
let workInProgressHook: Hook | null = null;
/** 当前正在对比的旧 Current Hook 节点指针 */
let currentHook: Hook | null = null;
/** 当前渲染批次的车道 */
let renderLane: Lane = NoLane;

/**
 * 函数组件 Hooks 渲染执行驱动主入口 (renderWithHooks)
 * 
 * @description
 * 1. 准备函数组件渲染环境，重置 `memoizedState` 与 `updateQueue`。
 * 2. **动态注入 Dispatcher**：
 *    - 初次挂载：将 `currentDispatcher.current` 设为 `HooksDispatcherOnMount`。
 *    - 后续更新：设为 `HooksDispatcherOnUpdate`。
 * 3. 调用 `Component(props)` 执行函数组件本体，期间用户调用的所有 Hooks 自动分发到对应的实现中。
 * 4. 渲染结束后清空全局环境变量，返回生成的 JSX 虚拟 DOM 子节点。
 * 
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/beginWork.ts`：处理 FunctionComponent、MemoComponent 与 ForwardRef 时。
 * 
 * @param wip 当前正在构建的 WIP FiberNode
 * @param Component 函数组件本体
 * @param props 组件当前收到的 props
 * @param lane 本次渲染批次的车道
 * @returns 组件函数执行返回的 children
 */
export function renderWithHooks(
  wip: FiberNode,
  Component: any,
  props: any,
  lane: Lane
): any {
  currentlyRenderingFiber = wip;
  wip.memoizedState = null;
  wip.updateQueue = null;
  renderLane = lane;

  const current = wip.alternate;
  if (current !== null && current.memoizedState !== null) {
    // 组件进入 Update 更新阶段
    currentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    // 组件首次 Mount 挂载阶段
    currentDispatcher.current = HooksDispatcherOnMount;
  }

  const children = Component(props);

  // 重置全局环境
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  renderLane = NoLane;

  return children;
}

/**
 * 挂载阶段创建并推进 Hook 节点
 */
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null
  };

  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error('Hooks 只能在 FunctionComponent 内调用！');
    }
    currentlyRenderingFiber.memoizedState = hook;
    workInProgressHook = hook;
  } else {
    workInProgressHook.next = hook;
    workInProgressHook = hook;
  }
  return workInProgressHook;
}

/**
 * 更新阶段推进并复用旧 Hook 节点
 */
function updateWorkInProgressHook(): Hook {
  let nextCurrentHook: Hook | null = null;

  if (currentHook === null) {
    const current = currentlyRenderingFiber?.alternate;
    if (current !== null && current !== undefined) {
      nextCurrentHook = current.memoizedState;
    }
  } else {
    nextCurrentHook = currentHook.next;
  }

  if (nextCurrentHook === null) {
    throw new Error('组件渲染期间执行的 Hook 数量多于上次渲染！');
  }

  currentHook = nextCurrentHook;
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue,
    queue: currentHook.queue,
    next: null
  };

  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error('Hooks 只能在 FunctionComponent 内调用！');
    }
    currentlyRenderingFiber.memoizedState = newHook;
    workInProgressHook = newHook;
  } else {
    workInProgressHook.next = newHook;
    workInProgressHook = newHook;
  }

  return workInProgressHook;
}

// ----------------------------------------------------
// 挂载阶段 Hooks (HooksDispatcherOnMount)
// ----------------------------------------------------

/** 挂载 useState */
function mountState<S>(initialState: S | (() => S)): [S, Dispatch<Action<S>>] {
  const hook = mountWorkInProgressHook();
  let state = initialState;
  if (typeof initialState === 'function') {
    state = (initialState as () => S)();
  }

  hook.memoizedState = state;
  hook.baseState = state;

  const queue = createUpdateQueue<S>();
  hook.queue = queue;

  const fiber = currentlyRenderingFiber!;
  const dispatch: Dispatch<Action<S>> = (action: Action<S>) => {
    dispatchSetState(fiber, queue, action);
  };
  queue.dispatch = dispatch;

  return [hook.memoizedState, dispatch];
}

/** 挂载 useEffect */
function mountEffect(
  create: () => (() => void) | void,
  deps?: any[] | null
): void {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber!.flags |= Passive;
  hook.memoizedState = pushEffect(Passive, create, undefined, nextDeps);
}

/** 挂载 useTransition */
function mountTransition(): [boolean, (callback: () => void) => void] {
  const [isPending, setPending] = mountState(false);
  const hook = mountWorkInProgressHook();

  const start = (callback: () => void) => {
    // 1. 同步将 isPending 置为 true
    setPending(true);

    const prevTransition = ReactCurrentBatchConfig.transition;
    ReactCurrentBatchConfig.transition = 1;

    try {
      // 2. 在 Transition 上下文执行用户回调
      callback();
      // 3. 在 Transition 车道中将 isPending 重置为 false
      setPending(false);
    } finally {
      ReactCurrentBatchConfig.transition = prevTransition;
    }
  };

  hook.memoizedState = start;
  return [isPending, start];
}

/** 挂载 useRef */
function mountRef<T>(initialValue: T): { current: T } {
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };
  hook.memoizedState = ref;
  return ref;
}

/** 挂载 useMemo */
function mountMemo<T>(create: () => T, deps?: any[] | null): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = create();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

/** 挂载 useCallback */
function mountCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps?: any[] | null
): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

// ----------------------------------------------------
// 更新阶段 Hooks (HooksDispatcherOnUpdate)
// ----------------------------------------------------

/** 更新 useState：消费更新队列并支持 Lane 优先级调度 */
function updateState<S>(): [S, Dispatch<Action<S>>] {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue!;
  const pending = queue.shared.pending;
  const current = currentHook!;
  let baseQueue = current.baseQueue;

  if (pending !== null) {
    queue.shared.pending = null;
    baseQueue = mergeUpdateQueues(baseQueue, pending);
    current.baseQueue = baseQueue;
  }

  if (baseQueue !== null) {
    const { memoizedState, baseState, baseQueue: newBaseQueue, newLanes } = processUpdateQueue(
      current.baseState,
      baseQueue,
      renderLane
    );
    hook.memoizedState = memoizedState;
    hook.baseState = baseState;
    hook.baseQueue = newBaseQueue;

    // 将未完成的更新车道合并到当前 Fiber 节点的 lanes 上，以便后续继续调度
    currentlyRenderingFiber!.lanes = mergeLanes(currentlyRenderingFiber!.lanes, newLanes);
  }

  return [hook.memoizedState, queue.dispatch!];
}

/** 更新 useEffect：对比依赖项是否变更 */
function updateEffect(
  create: () => (() => void) | void,
  deps?: any[] | null
): void {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy: (() => void) | void = undefined;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState as Effect;
    destroy = prevEffect.destroy;

    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(0, create, destroy, nextDeps);
        return;
      }
    }
  }

  currentlyRenderingFiber!.flags |= Passive;
  hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
}

/** 更新 useTransition */
function updateTransition(): [boolean, (callback: () => void) => void] {
  const [isPending] = updateState<boolean>();
  const hook = updateWorkInProgressHook();
  const start = hook.memoizedState;
  return [isPending, start];
}

/** 更新 useRef */
function updateRef<T>(): { current: T } {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

/** 更新 useMemo */
function updateMemo<T>(create: () => T, deps?: any[] | null): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;

  if (prevState !== null && nextDeps !== null) {
    const prevDeps = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }

  const nextValue = create();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

/** 更新 useCallback */
function updateCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps?: any[] | null
): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;

  if (prevState !== null && nextDeps !== null) {
    const prevDeps = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }

  hook.memoizedState = [callback, nextDeps];
  return callback;
}

/**
 * 统一的 setState 触发函数
 * 
 * @description
 * 1. 请求更新车道 `lane = requestUpdateLane()`。
 * 2. 创建 Update 并放入环形队列。
 * 3. 调用 `scheduleUpdateOnFiber(fiber, lane)` 启动协调。
 */
function dispatchSetState<S>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<S>,
  action: Action<S>
) {
  const lane = requestUpdateLane();
  const update = createUpdate(action, lane);
  enqueueUpdate(updateQueue, update);
  scheduleUpdateOnFiber(fiber, lane);
}

/**
 * 将 Effect 节点压入组件的环形副作用链表
 */
function pushEffect(
  hookFlags: Flags,
  create: () => (() => void) | void,
  destroy: (() => void) | void,
  deps: any[] | null
): Effect {
  const effect: Effect = {
    tag: hookFlags,
    create,
    destroy,
    deps,
    next: null
  };

  let updateQueue = currentlyRenderingFiber!.updateQueue as FunctionComponentUpdateQueue | null;
  if (updateQueue === null) {
    updateQueue = { lastEffect: null };
    currentlyRenderingFiber!.updateQueue = updateQueue;
    effect.next = effect;
    updateQueue.lastEffect = effect;
  } else {
    const lastEffect = updateQueue.lastEffect;
    if (lastEffect === null) {
      effect.next = effect;
      updateQueue.lastEffect = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      updateQueue.lastEffect = effect;
    }
  }
  return effect;
}

/**
 * 浅比较两组 Hook 依赖项是否全等 (Object.is)
 */
function areHookInputsEqual(nextDeps: any[], prevDeps: any[] | null): boolean {
  if (prevDeps === null) return false;
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) continue;
    return false;
  }
  return true;
}

/** 挂载 useLayoutEffect */
function mountLayoutEffect(
  create: () => (() => void) | void,
  deps?: any[] | null
): void {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber!.flags |= Layout;
  hook.memoizedState = pushEffect(Layout, create, undefined, nextDeps);
}

/** 更新 useLayoutEffect */
function updateLayoutEffect(
  create: () => (() => void) | void,
  deps?: any[] | null
): void {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy: (() => void) | void = undefined;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState as Effect;
    destroy = prevEffect.destroy;

    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(0, create, destroy, nextDeps);
        return;
      }
    }
  }

  currentlyRenderingFiber!.flags |= Layout;
  hook.memoizedState = pushEffect(Layout, create, destroy, nextDeps);
}

/** 挂载 useImperativeHandle */
function mountImperativeHandle(ref: any, init: () => any, deps?: any[] | null): void {
  const effectDeps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
  mountLayoutEffect(() => {
    if (typeof ref === 'function') {
      ref(init());
      return () => ref(null);
    } else if (ref != null) {
      ref.current = init();
      return () => {
        ref.current = null;
      };
    }
  }, effectDeps);
}

/** 更新 useImperativeHandle */
function updateImperativeHandle(ref: any, init: () => any, deps?: any[] | null): void {
  const effectDeps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
  updateLayoutEffect(() => {
    if (typeof ref === 'function') {
      ref(init());
      return () => ref(null);
    } else if (ref != null) {
      ref.current = init();
      return () => {
        ref.current = null;
      };
    }
  }, effectDeps);
}

let idCounter = 0;
/** 挂载 useId */
function mountId(): string {
  const hook = mountWorkInProgressHook();
  const id = `:r${idCounter++}:`;
  hook.memoizedState = id;
  return id;
}

/** 更新 useId */
function updateId(): string {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

/** 挂载 useSyncExternalStore */
function mountSyncExternalStore<Snapshot>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot
): Snapshot {
  const value = getSnapshot();
  const [, forceUpdate] = mountState(value);
  mountEffect(() => {
    const handleStoreChange = () => {
      forceUpdate(getSnapshot());
    };
    return subscribe(handleStoreChange);
  }, [subscribe]);
  return value;
}

/** 更新 useSyncExternalStore */
function updateSyncExternalStore<Snapshot>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot
): Snapshot {
  const value = getSnapshot();
  const [, forceUpdate] = updateState();
  updateEffect(() => {
    const handleStoreChange = () => {
      forceUpdate(getSnapshot());
    };
    return subscribe(handleStoreChange);
  }, [subscribe]);
  return value;
}

/** 挂载阶段的 Hooks 分发器对象 */
const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useReducer: ((reducer: any, initialArg: any) => mountState(initialArg)) as any,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
  useInsertionEffect: mountLayoutEffect,
  useRef: mountRef,
  useMemo: mountMemo,
  useCallback: mountCallback,
  useTransition: mountTransition,
  useContext: readContext,
  useImperativeHandle: mountImperativeHandle,
  useId: mountId,
  useSyncExternalStore: mountSyncExternalStore
};

/** 更新阶段的 Hooks 分发器对象 */
const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useReducer: ((reducer: any, initialArg: any) => updateState()) as any,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
  useInsertionEffect: updateLayoutEffect,
  useRef: updateRef,
  useMemo: updateMemo,
  useCallback: updateCallback,
  useTransition: updateTransition,
  useContext: readContext,
  useImperativeHandle: updateImperativeHandle,
  useId: updateId,
  useSyncExternalStore: updateSyncExternalStore
};

