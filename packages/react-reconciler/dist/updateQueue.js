import { NoLane, isSubsetOfLanes, mergeLanes } from './fiberLane';
/**
 * 创建一个 Update 更新节点
 *
 * @param action 更新内容（数值或更新函数）
 * @param lane 本次更新的优先级车道
 * @returns 初始化好的 Update 对象
 */
export function createUpdate(action, lane) {
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
export function createUpdateQueue() {
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
export function enqueueUpdate(updateQueue, update) {
    const pending = updateQueue.shared.pending;
    if (pending === null) {
        update.next = update;
    }
    else {
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
export function mergeUpdateQueues(baseQueue, pendingQueue) {
    if (baseQueue === null)
        return pendingQueue;
    if (pendingQueue === null)
        return baseQueue;
    const baseFirst = baseQueue.next;
    const pendingFirst = pendingQueue.next;
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
export function processUpdateQueue(baseState, pendingUpdate, renderLane) {
    let memoizedState = baseState;
    let newBaseState = baseState;
    let newBaseQueueFirst = null;
    let newBaseQueueLast = null;
    let newLanes = NoLane;
    if (pendingUpdate !== null) {
        const first = pendingUpdate.next;
        let current = first;
        do {
            const updateLane = current.lane;
            if (!isSubsetOfLanes(renderLane, updateLane)) {
                // 优先级不足，跳过此更新！保留到 newBaseQueue
                const clone = {
                    action: current.action,
                    lane: current.lane,
                    next: null
                };
                if (newBaseQueueLast === null) {
                    newBaseQueueFirst = clone;
                    newBaseQueueLast = clone;
                    newBaseState = memoizedState; // 冻结状态
                }
                else {
                    newBaseQueueLast.next = clone;
                    newBaseQueueLast = clone;
                }
                newLanes = mergeLanes(newLanes, updateLane);
            }
            else {
                // 优先级满足，应用更新！
                if (newBaseQueueLast !== null) {
                    const clone = {
                        action: current.action,
                        lane: NoLane,
                        next: null
                    };
                    newBaseQueueLast.next = clone;
                    newBaseQueueLast = clone;
                }
                const action = current.action;
                if (typeof action === 'function') {
                    memoizedState = action(memoizedState);
                }
                else {
                    memoizedState = action;
                }
            }
            current = current.next;
        } while (current !== first);
        if (newBaseQueueLast === null) {
            newBaseState = memoizedState;
        }
        else {
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
//# sourceMappingURL=updateQueue.js.map