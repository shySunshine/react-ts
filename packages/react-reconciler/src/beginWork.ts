import {
  WorkTag,
  FunctionComponent,
  HostRoot,
  HostComponent,
  HostText,
  Fragment,
  MemoComponent,
  ContextProvider,
  ForwardRef,
  HostPortal,
  ReactElement
} from '@react-ts/shared';
import { FiberNode } from './fiber';
import { Ref } from './fiberFlags';
import { Lane, isSubsetOfLanes, removeLanes, mergeLanes } from './fiberLane';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import { reconcileChildFibers, mountChildFibers, cloneChildFibers } from './childFiber';
import { renderWithHooks } from './fiberHooks';
import { checkPropsChanged } from './completeWork';
import { pushProvider } from './fiberContext';

/** 标记当前节点是否实际接收到了新更新（props 变化或有属于本次 renderLane 的自身更新） */
let didReceiveUpdate = false;

/**
 * 协调“递”阶段主入口 (beginWork)
 * 
 * @description
 * 从根节点开始自顶向下遍历 Fiber 树：
 * 1. **Bailout 性能优化判断**：若 props 未发生变更且节点自身没有属于本次 `renderLane` 的更新，则直接触发 `bailoutOnAlreadyFinishedWork` 跳过当前节点！
 * 2. 清除本次已消费的 `renderLane`。
 * 3. 根据 `wip.tag` 分发到具体的组件处理函数（如 `updateFunctionComponent`、`updateHostComponent` 等）。
 * 4. 执行组件内部逻辑后，调用 `reconcileChildren` 与新生成的子虚拟 DOM 进行 Diff，返回第一个子级 FiberNode（`wip.child`）。
 * 
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/workLoop.ts` 中的 `performUnitOfWork`。
 * 
 * @param current 上一次渲染生效的旧 Fiber 节点（初次挂载时为 null）
 * @param wip 正在构建中的新 Fiber 节点
 * @param renderLane 本次渲染批次的目标车道
 * @returns 第一个子级 FiberNode；若为叶子节点（如 HostText）或 Bailout 整棵子树，则返回 null
 */
export function beginWork(
  current: FiberNode | null,
  wip: FiberNode,
  renderLane: Lane
): FiberNode | null {
  // 1. 全局 Bailout 判定 (React 18 核心性能优化)
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = wip.pendingProps;

    // 判定 Props 是否发生改变
    if (oldProps !== newProps || checkPropsChanged(oldProps, newProps)) {
      didReceiveUpdate = true;
    } else if (!isSubsetOfLanes(wip.lanes, renderLane)) {
      // 当前节点没有针对本次 renderLane 的自身更新，直接触发 Bailout 跳过当前节点！
      didReceiveUpdate = false;
      return bailoutOnAlreadyFinishedWork(current, wip, renderLane);
    } else {
      didReceiveUpdate = false;
    }
  } else {
    didReceiveUpdate = false;
  }

  // 清除 WIP 节点上针对本次 renderLane 的任务标记
  wip.lanes = removeLanes(wip.lanes, renderLane);

  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(current, wip, renderLane);
    case HostComponent:
      return updateHostComponent(current, wip);
    case HostText:
      return null;
    case FunctionComponent:
      return updateFunctionComponent(current, wip, renderLane);
    case MemoComponent:
      return updateMemoComponent(current, wip, renderLane);
    case Fragment:
      return updateFragment(current, wip);
    case ContextProvider:
      return updateContextProvider(current, wip, renderLane);
    case ForwardRef:
      return updateForwardRef(current, wip, renderLane);
    case HostPortal:
      return updateHostPortal(current, wip);
    default:
      return null;
  }
}

/**
 * 1:1 React 18 协调器已完成工作 Bailout 核心逻辑
 * 
 * @description
 * 当当前 Fiber 确定无需重新渲染时：
 * 1. 继承复用 `current` 节点的 `updateQueue` 与 `memoizedState`。
 * 2. 检查子树：`if (!isSubsetOfLanes(wip.childLanes, renderLane))`：
 *    - 若整棵子树中所有后代节点均没有属于本次 `renderLane` 的待执行更新，**直接返回 null 剪枝跳过整棵子树**！
 * 3. 若子树中仍有更新，调用 `cloneChildFibers` 复用当前已有的子 Fiber 链表，继续向下探查。
 * 
 * @param current 旧 Fiber 节点
 * @param wip 当前 WIP Fiber 节点
 * @param renderLane 渲染车道
 * @returns 复用克隆出的第一个子 Fiber（或 null）
 */
export function bailoutOnAlreadyFinishedWork(
  current: FiberNode | null,
  wip: FiberNode,
  renderLane: Lane
): FiberNode | null {
  if (current !== null) {
    wip.updateQueue = current.updateQueue;
    wip.memoizedState = current.memoizedState;
  }

  // 检查子树是否有待执行的任务
  if (!isSubsetOfLanes(wip.childLanes, renderLane)) {
    // 整棵子树都没有属于 renderLane 的更新，整棵子树直接跳过！
    return null;
  }

  // 子树中存在待执行任务，克隆已有的子 Fiber 链表并继续向下调和
  cloneChildFibers(current, wip);
  return wip.child;
}

/**
 * 协调 HostRoot 根节点
 * 
 * @description
 * 消费根节点的更新队列，计算出最新的根 children ReactElement，并进入子节点 Diff。
 */
function updateHostRoot(
  current: FiberNode | null,
  wip: FiberNode,
  renderLane: Lane
): FiberNode | null {
  const baseState = wip.memoizedState;
  const updateQueue = wip.updateQueue as UpdateQueue<ReactElement> | null;
  const pending = updateQueue?.shared.pending || null;

  if (pending !== null && updateQueue !== null) {
    const { memoizedState, newLanes } = processUpdateQueue(baseState, pending, renderLane);
    wip.memoizedState = memoizedState;
    updateQueue.shared.pending = null;
    wip.lanes = mergeLanes(wip.lanes, newLanes);
  }

  const nextChildren = wip.memoizedState;
  if (current !== null && nextChildren === current.memoizedState) {
    return bailoutOnAlreadyFinishedWork(current, wip, renderLane);
  }
  reconcileChildren(current, wip, nextChildren);
  return wip.child;
}

/**
 * 标记 Ref 变更副作用
 * 
 * @description
 * 若初次挂载带有 ref，或更新阶段 ref 引用发生了变化，打上 `Ref` 副作用标记。
 */
function markRef(current: FiberNode | null, wip: FiberNode) {
  const ref = wip.ref;
  if ((current === null && ref !== null) || (current !== null && current.ref !== ref)) {
    wip.flags |= Ref;
  }
}

/**
 * 协调 HostComponent 原生 DOM 节点 (如 div, span)
 */
function updateHostComponent(current: FiberNode | null, wip: FiberNode): FiberNode | null {
  const nextProps = wip.pendingProps;
  const nextChildren = nextProps.children;
  markRef(current, wip);
  reconcileChildren(current, wip, nextChildren);
  return wip.child;
}

/**
 * 协调 FunctionComponent 函数组件
 * 
 * @description
 * 执行 `renderWithHooks` 运行函数组件本体，收集 Hooks 并获取返回的 JSX 子节点。
 */
function updateFunctionComponent(
  current: FiberNode | null,
  wip: FiberNode,
  renderLane: Lane
): FiberNode | null {
  const Component = wip.type;
  const nextProps = wip.pendingProps;
  const nextChildren = renderWithHooks(wip, Component, nextProps, renderLane);
  reconcileChildren(current, wip, nextChildren);
  return wip.child;
}

/**
 * 协调 MemoComponent 记忆化组件
 * 
 * @description
 * 优先调用自定义 `compare` 函数或浅比较 `checkPropsChanged`：
 * 若 props 相同且节点自身无未处理的 lane，直接走 `bailoutOnAlreadyFinishedWork` 跳过组件重渲染。
 */
function updateMemoComponent(
  current: FiberNode | null,
  wip: FiberNode,
  renderLane: Lane
): FiberNode | null {
  const Component = wip.type.type;
  const compare = wip.type.compare;
  const nextProps = wip.pendingProps;

  if (current !== null) {
    const prevProps = current.memoizedProps;
    const isSame = compare ? compare(prevProps, nextProps) : !checkPropsChanged(prevProps, nextProps);
    if (isSame && !isSubsetOfLanes(wip.lanes, renderLane)) {
      return bailoutOnAlreadyFinishedWork(current, wip, renderLane);
    }
  }

  const nextChildren = renderWithHooks(wip, Component, nextProps, renderLane);
  reconcileChildren(current, wip, nextChildren);
  return wip.child;
}

/**
 * 协调 ContextProvider 上下文提供者组件
 * 
 * @description
 * 将新传入的 `value` 通过 `pushProvider` 压入上下文栈，随后协调子节点。
 */
function updateContextProvider(
  current: FiberNode | null,
  wip: FiberNode,
  renderLane: Lane
): FiberNode | null {
  const providerType = wip.type;
  const context = providerType._context;
  const newProps = wip.pendingProps;
  const nextValue = newProps.value;

  pushProvider(context, nextValue);

  const nextChildren = newProps.children;
  reconcileChildren(current, wip, nextChildren);
  return wip.child;
}

/**
 * 协调 ForwardRef 转发组件
 */
function updateForwardRef(
  current: FiberNode | null,
  wip: FiberNode,
  renderLane: Lane
): FiberNode | null {
  const render = wip.type.render;
  const nextProps = wip.pendingProps;
  const ref = wip.ref;
  markRef(current, wip);
  const nextChildren = renderWithHooks(wip, (p: any) => render(p, ref), nextProps, renderLane);
  reconcileChildren(current, wip, nextChildren);
  return wip.child;
}

/**
 * 协调 HostPortal 传送门节点
 */
function updateHostPortal(current: FiberNode | null, wip: FiberNode): FiberNode | null {
  const nextChildren = wip.pendingProps.children;
  reconcileChildren(current, wip, nextChildren);
  return wip.child;
}

/**
 * 协调 Fragment 片段节点
 */
function updateFragment(current: FiberNode | null, wip: FiberNode): FiberNode | null {
  const nextChildren = wip.pendingProps.children;
  reconcileChildren(current, wip, nextChildren);
  return wip.child;
}

/**
 * 子节点协调分发器 (reconcileChildren)
 * 
 * @description
 * - 初次挂载（`current === null`）：调用 `mountChildFibers`。性能优化关键点：不为子节点打 Placement 标记，整棵子树构建完成后仅在 HostRoot 打一次 Placement，避免千百次不必要的 DOM 插入操作！
 * - 更新阶段（`current !== null`）：调用 `reconcileChildFibers` 执行完整的 Diff 算法，精确追踪每个子节点的增删改移并打上 Flags。
 * 
 * @param current 旧 Fiber 节点
 * @param wip 当前 WIP Fiber 节点
 * @param children 新生成的子虚拟 DOM 结构
 */
function reconcileChildren(current: FiberNode | null, wip: FiberNode, children: any) {
  if (current === null) {
    // 首次挂载优化：不给子节点打 Placement，只由 HostRoot 统一 Placement
    wip.child = mountChildFibers(wip, null, children);
  } else {
    // 更新阶段：追踪子节点的变动并打上相应 Flags
    wip.child = reconcileChildFibers(wip, current.child, children);
  }
}

