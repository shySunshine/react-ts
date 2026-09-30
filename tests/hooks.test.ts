import { describe, it, expect } from 'vitest';
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue
} from '../packages/react-reconciler/src/updateQueue';
import {
  SyncLane,
  DefaultLane,
  TransitionLane1
} from '../packages/react-reconciler/src/fiberLane';

describe('React 18 更新队列与优先级过滤单测', () => {
  it('环形链表入队: 两个更新应维持正确的循环链表指针', () => {
    const queue = createUpdateQueue<number>();
    const update1 = createUpdate(10, SyncLane);
    const update2 = createUpdate(20, SyncLane);

    enqueueUpdate(queue, update1);
    expect(queue.shared.pending).toBe(update1);
    expect(update1.next).toBe(update1); // 单节点自环

    enqueueUpdate(queue, update2);
    expect(queue.shared.pending).toBe(update2); // pending 指向队尾
    expect(update2.next).toBe(update1); // update2.next 指向队头 update1
    expect(update1.next).toBe(update2); // update1.next 指向队尾 update2
  });

  it('processUpdateQueue: 严格按 renderLane 过滤更新并支持函数式计算', () => {
    const queue = createUpdateQueue<number>();

    // 排队 3 个更新:
    // 1. SyncLane: +10
    // 2. TransitionLane1: +100
    // 3. SyncLane: * 2
    enqueueUpdate(queue, createUpdate((prev: number) => prev + 10, SyncLane));
    enqueueUpdate(queue, createUpdate((prev: number) => prev + 100, TransitionLane1));
    enqueueUpdate(queue, createUpdate((prev: number) => prev * 2, SyncLane));

    // 本次仅渲染 SyncLane
    const syncResult = processUpdateQueue(5, queue.shared.pending, SyncLane);
    // 预期: (5 + 10) * 2 = 30，TransitionLane1 被跳过
    expect(syncResult.memoizedState).toBe(30);

    // 本次渲染 TransitionLane1
    const transitionResult = processUpdateQueue(5, queue.shared.pending, TransitionLane1);
    // 预期: 5 + 100 = 105
    expect(transitionResult.memoizedState).toBe(105);
  });
});
