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
  TransitionLane1,
  NoLane
} from '../packages/react-reconciler/src/fiberLane';
import { memo } from '../packages/react/src/memo';
import { REACT_MEMO_TYPE } from '@react-ts/shared';

describe('React 18 1:1 核心并发特性单测', () => {
  describe('UpdateQueue baseQueue / baseState 优先级跳过与回放机制', () => {
    it('在 SyncLane 渲染期间跳过 TransitionLane，并正确保留在 baseQueue 中', () => {
      // 初始状态为 0
      const initial = 0;

      // 创建一个 TransitionLane 低优先级更新 (+100)
      const queue = createUpdateQueue<number>();
      const transitionUpdate = createUpdate<number>((prev) => prev + 100, TransitionLane1);
      enqueueUpdate(queue, transitionUpdate);

      // 创建一个 SyncLane 高优先级插队更新 (+5)
      const syncUpdate = createUpdate<number>((prev) => prev + 5, SyncLane);
      enqueueUpdate(queue, syncUpdate);

      // 第一轮渲染：当前渲染车道为 SyncLane (高优先级)
      const firstPass = processUpdateQueue(initial, queue.shared.pending, SyncLane);

      // 验证：
      // 1. memoizedState 只执行了 SyncLane 更新: 0 + 5 = 5
      expect(firstPass.memoizedState).toBe(5);
      // 2. baseState 冻结在第一个被跳过更新之前的状态: 0
      expect(firstPass.baseState).toBe(0);
      // 3. baseQueue 保留了被跳过的低优先级更新及后续所有更新
      expect(firstPass.baseQueue).not.toBeNull();
      // 4. newLanes 标记了未完成的 TransitionLane1
      expect(firstPass.newLanes & TransitionLane1).not.toBe(0);

      // 第二轮渲染：调度器处理遗留的低优先级 TransitionLane1
      const secondPass = processUpdateQueue(firstPass.baseState, firstPass.baseQueue, TransitionLane1);

      // 验证：
      // 完整从 baseState(0) 开始回放 Transition(+100) 与已应用过的 Sync(+5) -> 0 + 100 + 5 = 105
      expect(secondPass.memoizedState).toBe(105);
      expect(secondPass.baseQueue).toBeNull();
      expect(secondPass.newLanes).toBe(NoLane);
    });
  });

  describe('React.memo 高阶组件定义与标记', () => {
    it('memo 函数应正确返回带 REACT_MEMO_TYPE 的 MemoComponent 结构体', () => {
      const DummyComponent = (props: { name: string }) => props.name;
      const MemoDummy = memo(DummyComponent);

      expect(MemoDummy.$$typeof).toBe(REACT_MEMO_TYPE);
      expect(MemoDummy.type).toBe(DummyComponent);
      expect(MemoDummy.compare).toBeNull();
    });

    it('支持自定义比较函数 compare', () => {
      const DummyComponent = () => 'test';
      const customCompare = (prev: any, next: any) => prev.id === next.id;
      const MemoDummy = memo(DummyComponent, customCompare);

      expect(MemoDummy.compare).toBe(customCompare);
    });
  });
});
