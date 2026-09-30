import { FiberNode } from './fiber';
import { Lane } from './fiberLane';
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
export declare function beginWork(current: FiberNode | null, wip: FiberNode, renderLane: Lane): FiberNode | null;
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
export declare function bailoutOnAlreadyFinishedWork(current: FiberNode | null, wip: FiberNode, renderLane: Lane): FiberNode | null;
//# sourceMappingURL=beginWork.d.ts.map