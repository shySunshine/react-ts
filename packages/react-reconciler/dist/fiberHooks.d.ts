import { FiberNode } from './fiber';
import { Lane } from './fiberLane';
import { Flags } from './fiberFlags';
import { Update, UpdateQueue } from './updateQueue';
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
export declare function renderWithHooks(wip: FiberNode, Component: any, props: any, lane: Lane): any;
//# sourceMappingURL=fiberHooks.d.ts.map