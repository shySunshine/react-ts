import { describe, it, expect } from 'vitest';
import {
  push,
  pop,
  peek,
  HeapNode
} from '../packages/scheduler/src/SchedulerMinHeap';
import {
  SyncLane,
  DefaultLane,
  TransitionLane1,
  TransitionLanes,
  getHighestPriorityLane,
  mergeLanes,
  removeLanes,
  isSubsetOfLanes
} from '../packages/react-reconciler/src/fiberLane';

describe('Scheduler MinHeap 最小堆算法测试', () => {
  it('应严格按 sortIndex 从小到大弹出最小元素', () => {
    const heap: HeapNode[] = [];
    push(heap, { id: 1, sortIndex: 50 });
    push(heap, { id: 2, sortIndex: 10 });
    push(heap, { id: 3, sortIndex: 30 });
    push(heap, { id: 4, sortIndex: 5 });

    expect(peek(heap)?.sortIndex).toBe(5);
    expect(pop(heap)?.sortIndex).toBe(5);
    expect(pop(heap)?.sortIndex).toBe(10);
    expect(pop(heap)?.sortIndex).toBe(30);
    expect(pop(heap)?.sortIndex).toBe(50);
    expect(pop(heap)).toBeNull();
  });
});

describe('React 18 31位 Lane 优先级位运算测试', () => {
  it('getHighestPriorityLane 应正确取出数值最小（优先级最高）的独立车道', () => {
    // 合并 DefaultLane(4) 与 SyncLane(1)
    const combined = mergeLanes(DefaultLane, SyncLane);
    expect(getHighestPriorityLane(combined)).toBe(SyncLane);

    // 合并 TransitionLane1(8) 与 DefaultLane(4)
    const combined2 = mergeLanes(TransitionLane1, DefaultLane);
    expect(getHighestPriorityLane(combined2)).toBe(DefaultLane);
  });

  it('isSubsetOfLanes 应正确判定车道包含关系', () => {
    const lanes = mergeLanes(SyncLane, TransitionLane1);
    expect(isSubsetOfLanes(lanes, SyncLane)).toBe(true);
    expect(isSubsetOfLanes(lanes, TransitionLane1)).toBe(true);
    expect(isSubsetOfLanes(lanes, DefaultLane)).toBe(false);
  });

  it('removeLanes 应正确移除已完成的车道', () => {
    const lanes = mergeLanes(SyncLane, DefaultLane);
    const after = removeLanes(lanes, SyncLane);
    expect(after).toBe(DefaultLane);
  });
});
