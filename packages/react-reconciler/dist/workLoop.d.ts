import { FiberNode, FiberRootNode } from './fiber';
import { Lane } from './fiberLane';
/**
 * 在 Fiber 节点上调度更新 (scheduleUpdateOnFiber)
 *
 * @description
 * 组件状态变更（setState、useReducer、createRoot.render）后通知协调器的统一入口：
 * 1. 将本次更新的 `lane` 从触发节点沿着 `return` 指针一路向上冒泡合并到根节点 `FiberRootNode`。
 * 2. 标记根节点的 `pendingLanes`。
 * 3. 调用 `ensureRootIsScheduled(root)` 启动或调整调度器的执行任务。
 *
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/index.ts` 中的 `updateContainer`。
 * - `packages/react-reconciler/src/fiberHooks.ts` 中的 `dispatchSetState`。
 *
 * @param fiber 触发更新的 Fiber 节点
 * @param lane 本次更新分配的优先级车道
 */
export declare function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane): void;
/**
 * 确保根节点被注册到调度器中 (并发调度与打断的核心控制中枢)
 *
 * @description
 * 依据根节点当前累积的所有 `pendingLanes`：
 * 1. 若无待处理车道，取消旧的调度回调并退出。
 * 2. 提取最高优先级车道 `updateLane = getHighestPriorityLane(root.pendingLanes)`。
 * 3. 判断是否已有调度任务在运行：
 *    - 若已有任务且优先级相同：复用已有任务，无需重复调度。
 *    - 若新任务优先级更高：**打断（Cancel）已有低优先级任务**！
 * 4. 向 Scheduler 注册异步任务，绑定回调函数 `performConcurrentWorkOnRoot`。
 *
 * @param root 应用的 FiberRootNode
 */
export declare function ensureRootIsScheduled(root: FiberRootNode): void;
/**
 * 并发渲染主入口 (performConcurrentWorkOnRoot)
 *
 * @description
 * Scheduler 调度执行的核心工作函数。
 * 驱动两阶段执行：
 * 1. **Render 阶段**：执行可中断的 `workLoopConcurrent`（或同步 `workLoopSync`），构建整棵 WIP Fiber 树。
 *    若时间切片用尽但未完成，返回延续函数，等待 Scheduler 下一轮时间片继续处理。
 * 2. **Commit 阶段**：Render 阶段全部完成后，调用 `commitRoot(root)`，同步将所有 DOM 变更提交到真实屏幕上。
 *
 * @param root 应用根节点
 * @param didUserCallbackTimeout 是否因为调度任务超时而必须强制同步执行
 * @returns 若未完成返回延续函数 `performConcurrentWorkOnRoot.bind(...)`；完成后返回 null
 */
export declare function performConcurrentWorkOnRoot(root: FiberRootNode, didUserCallbackTimeout: boolean): any;
//# sourceMappingURL=workLoop.d.ts.map