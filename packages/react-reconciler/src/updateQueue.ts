import { Action, Dispatch } from '@react-ts/shared';
import { Lane, NoLane, isSubsetOfLanes, mergeLanes } from './fiberLane';

/**
 * 单个更新动作单元 (Update)
 */
export interface Update<State> {
  /** 触发更新的 Action（具体值或计算函数） */
  action: Action<State>;
  /** 触发本次更新所分配的 Lane 车道优先级 */
  lane: Lane;
  /** 指向环形更新链表中的下一个 Update 节点 */
  next: Update<any> | null;
}

/**
 * 挂载在 Fiber 节点上的更新队列 (UpdateQueue)
 */
export interface UpdateQueue<State> {
  shared: {
    /** 
     * 指向环形单向链表的尾节点 (pending)。
     * 环形链表设计精髓：pending 永远指向队尾，而 pending.next 永远指向队首！
     * 这使得查找队首和在队尾追加新节点均能在 O(1) 常数时间内完成。
     */
    pending: Update<State> | null;
  };
  /** 状态派发函数引用 */
  dispatch: Dispatch<Action<State>> | null;
}

/**
 * 消费更新队列后的计算结果接口
 */
export interface ProcessUpdateQueueResult<State> {
  /** 本次渲染最终计算出的最新状态 */
  memoizedState: State;
  /** 下次更新计算所依据的基础状态（若有更新被跳过则被冻结） */
  baseState: State;
  /** 保留未被消费或被跳过的 Update 链表 */
  baseQueue: Update<State> | null;
  /** 剩余未消费更新所涉及的 Lane 车道集合 */
  newLanes: Lane;
}

/**
 * 创建一个 Update 更新节点
 * 
 * @param action 更新内容（数值或更新函数）
 * @param lane 本次更新的优先级车道
 * @returns 初始化好的 Update 对象
 */
export function createUpdate<State>(action: Action<State>, lane: Lane): Update<State> {
  return {
    action,
    lane,
    next: null
  };
}

/**
 * 初始化一个空的 UpdateQueue 队列
 * 
 * @returns 包含 shared.pending 环形链表头的 UpdateQueue 对象
 */
export function createUpdateQueue<State>(): UpdateQueue<State> {
  return {
    shared: {
      pending: null
    },
    dispatch: null
  };
}

/**
 * 环形链表入队操作 (enqueueUpdate)
 * 
 * @description
 * 在 $O(1)$ 时间内将新的 `update` 节点插入环形链表：
 * - 若原链表为空：`update.next = update`，形成自闭环。
 * - 若原链表已有节点：新节点的 next 指向原队首 `pending.next`，原队尾的 next 指向新节点，更新 `pending` 指向新节点。
 * 
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/index.ts` 中的 `updateContainer`（根更新入队）。
 * - `packages/react-reconciler/src/fiberHooks.ts` 中的 `dispatchSetState`（组件更新入队）。
 * 
 * @param updateQueue 目标更新队列
 * @param update 待入队的新更新
 */
export function enqueueUpdate<State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>
): void {
  const pending = updateQueue.shared.pending;
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  updateQueue.shared.pending = update;
}

/**
 * 将两个环形更新链表在 O(1) 时间内交叉缝合为一个新的环形链表
 * 
 * @description
 * 用于将未处理完的 `baseQueue` 与新产生的 `pendingQueue` 链接合并。
 * 
 * @param baseQueue 基础更新链表尾指针
 * @param pendingQueue 新进的待处理链表尾指针
 * @returns 缝合后的新环形链表尾指针
 */
export function mergeUpdateQueues<State>(
  baseQueue: Update<State> | null,
  pendingQueue: Update<State> | null
): Update<State> | null {
  if (baseQueue === null) return pendingQueue;
  if (pendingQueue === null) return baseQueue;

  const baseFirst = baseQueue.next!;
  const pendingFirst = pendingQueue.next!;

  baseQueue.next = pendingFirst;
  pendingQueue.next = baseFirst;

  return pendingQueue;
}

/**
 * 处理与消费更新队列 (processUpdateQueue)
 * 
 * @description
 * 1:1 遵循 React 18 官方算法：
 * 遍历环形更新链表，根据当前渲染批次的 `renderLane` 决定更新是消费还是跳过：
 * 1. 若当前 Update 的优先级不足以在本次批次中执行（`!isSubsetOfLanes(renderLane, updateLane)`）：
 *    - 跳过此更新！克隆该 Update 保存至 `newBaseQueue`。
 *    - 冻结 `newBaseState`，使后续批次能基于被跳过前的正确基准状态重放。
 *    - 收集剩余的 `newLanes`。
 * 2. 若优先级满足：
 *    - 若前面已经有更新被跳过，则即使当前更新被执行，也必须同时克隆并保留到 `newBaseQueue`（保证后续重放时状态计算的因果一致性）。
 *    - 计算新的 `memoizedState`。
 * 
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/beginWork.ts`：处理 HostRoot 节点的状态计算。
 * - `packages/react-reconciler/src/fiberHooks.ts`：更新阶段消费 Hooks 的更新队列。
 * 
 * @param baseState 状态计算的初始基准
 * @param pendingUpdate 环形链表尾指针
 * @param renderLane 本次渲染所处理的车道
 * @returns 计算后的状态及剩余 baseQueue
 */
export function processUpdateQueue<State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLane: Lane
): ProcessUpdateQueueResult<State> {
  let memoizedState = baseState;
  let newBaseState = baseState;
  let newBaseQueueFirst: Update<State> | null = null;
  let newBaseQueueLast: Update<State> | null = null;
  let newLanes: Lane = NoLane;

  if (pendingUpdate !== null) {
    const first = pendingUpdate.next!;
    let current: Update<State> = first;

    do {
      const updateLane = current.lane;
      if (!isSubsetOfLanes(renderLane, updateLane)) {
        // 优先级不足，跳过此更新！保留到 newBaseQueue
        const clone: Update<State> = {
          action: current.action,
          lane: current.lane,
          next: null
        };
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = clone;
          newBaseQueueLast = clone;
          newBaseState = memoizedState; // 冻结状态
        } else {
          newBaseQueueLast.next = clone;
          newBaseQueueLast = clone;
        }
        newLanes = mergeLanes(newLanes, updateLane);
      } else {
        // 优先级满足，应用更新！
        if (newBaseQueueLast !== null) {
          const clone: Update<State> = {
            action: current.action,
            lane: NoLane,
            next: null
          };
          newBaseQueueLast.next = clone;
          newBaseQueueLast = clone;
        }

        const action = current.action;
        if (typeof action === 'function') {
          memoizedState = (action as (prevState: State) => State)(memoizedState);
        } else {
          memoizedState = action;
        }
      }
      current = current.next!;
    } while (current !== first);

    if (newBaseQueueLast === null) {
      newBaseState = memoizedState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst; // 闭环
    }
  }

  return {
    memoizedState,
    baseState: newBaseState,
    baseQueue: newBaseQueueLast,
    newLanes
  };
}


