import { FiberNode } from './fiber';
/**
 * 协调“归”阶段主入口 (completeWork)
 *
 * @description
 * 当一个 Fiber 节点的子树全部遍历完毕，回溯进入 `completeWork`：
 * 1. **HostComponent（DOM 元素）**：
 *    - 初次挂载：调用 `hostConfig.createInstance` 创建真实 DOM 元素，并调用 `appendAllChildren` 将其直接子孙的 DOM 节点拼接在内存中，构建出完整的离屏 DOM 子树！
 *    - 更新阶段：对比新旧 props（`checkPropsChanged`），若发生变化打上 `Update` 副作用标记。
 * 2. **HostText（文本节点）**：创建真实 Text 实例或对比文本内容打上 `Update`。
 * 3. **ContextProvider**：调用 `popProvider` 将当前 Context 弹出上下文栈，恢复父级上下文。
 * 4. **副作用冒泡 (bubbleProperties)**：收集整棵子树的 `flags` 到 `subtreeFlags`，以及 `lanes` 到 `childLanes`。
 *
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/workLoop.ts` 中的 `completeUnitOfWork`。
 *
 * @param current 旧 Fiber 节点
 * @param wip 正在完成的 WIP Fiber 节点
 * @returns 始终返回 null（由 completeUnitOfWork 负责寻找兄弟或父节点）
 */
export declare function completeWork(current: FiberNode | null, wip: FiberNode): FiberNode | null;
/**
 * 浅比较两个 Props 对象是否发生实质变化
 *
 * @description
 * 忽略 `children`（由 Diff 算法专门比对），对比其余键值是否全等。
 *
 * @param oldProps 旧属性对象
 * @param newProps 新属性对象
 * @returns `true` 表示发生改变；`false` 表示完全相同
 */
export declare function checkPropsChanged(oldProps: any, newProps: any): boolean;
//# sourceMappingURL=completeWork.d.ts.map