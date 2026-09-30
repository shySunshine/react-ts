import { FiberRootNode } from './fiber';
/**
 * 提交阶段总入口 (commitRoot)
 *
 * @description
 * 在 Render 阶段完成整棵 WIP Fiber 树的协调后被同步调用。
 * Commit 阶段是**同步且不可中断**的，主要按次序执行三个关键子阶段：
 * 1. **调度 Passive 阶段 (useEffect)**：若树上存在 `PassiveMask`，向 Scheduler 注册异步非阻塞宏任务。
 * 2. **Mutation 阶段**：深度优先遍历树，同步执行真实 DOM 突变（`ChildDeletion` 卸载、`Placement` 挂载/移动、`Update` 属性文本变更、解绑旧 `Ref`）。
 * 3. **双缓存指针切换**：`root.current = finishedWork`，将已完成的树切换为屏幕生效树！
 * 4. **Layout 阶段**：在浏览器重绘（paint）前同步执行 `useLayoutEffect` 的销毁与创建回调，并绑定新 `Ref`。
 *
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/workLoop.ts` 中的 `performConcurrentWorkOnRoot`（Render 阶段全部完成后）。
 *
 * @param root 应用的 FiberRootNode
 */
export declare function commitRoot(root: FiberRootNode): void;
//# sourceMappingURL=commitWork.d.ts.map