import { HostRoot } from '@react-ts/shared';
import { createWorkInProgress } from './fiber';
import { NoLane, SyncLane, getHighestPriorityLane, lanesToSchedulerPriority, mergeLanes, removeLanes } from './fiberLane';
import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { commitRoot } from './commitWork';
import { unstable_scheduleCallback, unstable_cancelCallback, unstable_shouldYield, ImmediatePriority } from '@react-ts/scheduler';
/** 当前正在执行协调工作的 WorkInProgress FiberNode 指针 */
let workInProgress = null;
/** 本次协调渲染批次所聚焦处理的单一 Lane 车道 */
let renderLane = NoLane;
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
export function scheduleUpdateOnFiber(fiber, lane) {
    const root = markUpdateLaneFromFiberToRoot(fiber, lane);
    if (root === null)
        return;
    markRootUpdated(root, lane);
    ensureRootIsScheduled(root);
}
/**
 * 沿 Fiber 树向上冒泡更新车道直到根节点
 *
 * @description
 * 为当前节点打上 `lanes`，并为沿途的所有祖先节点打上 `childLanes`。
 * 这一步至关重要：后续在 `beginWork` 中，祖先节点通过比对自己的 `childLanes`，
 * 能够快速判断“我的子孙节点中是否存在本次需要更新的工作”，从而安全实现整棵子树的 Bailout 跳过！
 *
 * @param fiber 触发更新的节点
 * @param lane 更新车道
 * @returns 查找到的 `FiberRootNode`，若不在挂载树中则返回 null
 */
function markUpdateLaneFromFiberToRoot(fiber, lane) {
    let node = fiber;
    let parent = node.return;
    node.lanes = mergeLanes(node.lanes, lane);
    if (node.alternate !== null) {
        node.alternate.lanes = mergeLanes(node.alternate.lanes, lane);
    }
    while (parent !== null) {
        parent.childLanes = mergeLanes(parent.childLanes, lane);
        if (parent.alternate !== null) {
            parent.alternate.childLanes = mergeLanes(parent.alternate.childLanes, lane);
        }
        node = parent;
        parent = node.return;
    }
    if (node.tag === HostRoot) {
        return node.stateNode;
    }
    return null;
}
/**
 * 将更新车道记录在 FiberRootNode 的 pendingLanes 中
 */
function markRootUpdated(root, lane) {
    root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}
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
export function ensureRootIsScheduled(root) {
    const updateLane = getHighestPriorityLane(root.pendingLanes);
    const existingCallbackNode = root.callbackNode;
    if (updateLane === NoLane) {
        if (existingCallbackNode !== null) {
            unstable_cancelCallback(existingCallbackNode);
        }
        root.callbackNode = null;
        root.callbackPriority = 0;
        return;
    }
    const curPriority = lanesToSchedulerPriority(updateLane);
    // 优先级相同，复用已有调度任务，无需重复派发
    if (existingCallbackNode !== null && root.callbackPriority === curPriority) {
        return;
    }
    // 优先级更高，打断已有低优先级任务！
    if (existingCallbackNode !== null) {
        unstable_cancelCallback(existingCallbackNode);
    }
    root.callbackPriority = curPriority;
    if (updateLane === SyncLane) {
        // 同步紧急任务：以最高优先级立即微任务/宏任务执行
        root.callbackNode = unstable_scheduleCallback(ImmediatePriority, performConcurrentWorkOnRoot.bind(null, root));
    }
    else {
        // 普通/Transition 并发任务：以对应优先级交由 Scheduler 时间切片调度
        root.callbackNode = unstable_scheduleCallback(curPriority, performConcurrentWorkOnRoot.bind(null, root));
    }
}
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
export function performConcurrentWorkOnRoot(root, didUserCallbackTimeout) {
    const curLane = getHighestPriorityLane(root.pendingLanes);
    if (curLane === NoLane)
        return null;
    const shouldTimeSlice = curLane !== SyncLane && !didUserCallbackTimeout;
    // 准备全新或恢复已中断的 WIP 树
    prepareFreshStack(root, curLane);
    // 执行工作循环
    if (shouldTimeSlice) {
        workLoopConcurrent();
    }
    else {
        workLoopSync();
    }
    // 时间切片耗尽，渲染未完成，返回延续函数交由 Scheduler 下一轮继续
    if (workInProgress !== null) {
        return performConcurrentWorkOnRoot.bind(null, root);
    }
    // Render 阶段顺利完成，进入 Commit 阶段
    root.finishedWork = root.current.alternate;
    root.finishedLane = curLane;
    renderLane = NoLane;
    commitRoot(root);
    // 移除已完成的 Lane，并合并树上可能残留的低优先级更新车道 (如被插队跳过的 TransitionLane)
    const remainingLanes = mergeLanes(removeLanes(root.pendingLanes, curLane), mergeLanes(root.current.lanes, root.current.childLanes));
    root.pendingLanes = remainingLanes;
    root.callbackNode = null;
    // 检查是否还有剩余更新任务需要调度
    ensureRootIsScheduled(root);
    return null;
}
/**
 * 准备全新的工作栈或恢复现场
 *
 * @description
 * 若 `workInProgress` 为空或渲染车道发生变化，重新基于 `root.current` 创建根节点的 WIP 节点。
 */
function prepareFreshStack(root, lane) {
    if (workInProgress === null || renderLane !== lane) {
        workInProgress = createWorkInProgress(root.current, {});
        renderLane = lane;
    }
}
/**
 * 可中断的时间切片工作循环 (workLoopConcurrent)
 *
 * @description
 * 并发特性的核心体现：在执行每个 Fiber 工作单元间隙，调用 `unstable_shouldYield()` 探测 5ms 时间切片是否耗尽。
 * 若耗尽则退出循环让出主线程控制权，保留 `workInProgress` 状态以待后续切片恢复。
 */
function workLoopConcurrent() {
    while (workInProgress !== null && !unstable_shouldYield()) {
        performUnitOfWork(workInProgress);
    }
}
/**
 * 同步不可中断工作循环 (workLoopSync)
 *
 * @description
 * 对应同步或已超时的紧急任务，一口气执行完毕，不中途让出主线程。
 */
function workLoopSync() {
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}
/**
 * 执行单个 Fiber 工作单元 (performUnitOfWork)
 *
 * @description
 * 1. 调用 `beginWork`（“递”阶段）：计算状态、执行组件函数、Diff 子节点并返回第一个子 Fiber `next`。
 * 2. 将 `fiber.memoizedProps` 更新为 `fiber.pendingProps`。
 * 3. 若无子节点（`next === null`），则进入“归”阶段调用 `completeUnitOfWork(fiber)`；若有子节点，则将 `workInProgress` 指向子节点继续深入。
 *
 * @param fiber 当前工作单元 FiberNode
 */
function performUnitOfWork(fiber) {
    const next = beginWork(fiber.alternate, fiber, renderLane);
    fiber.memoizedProps = fiber.pendingProps;
    if (next === null) {
        completeUnitOfWork(fiber);
    }
    else {
        workInProgress = next;
    }
}
/**
 * 完成工作单元并向兄弟/父级回溯 (completeUnitOfWork)
 *
 * @description
 * “归”阶段的遍历逻辑：
 * 1. 调用 `completeWork(node.alternate, node)` 构建 DOM/冒泡副作用。
 * 2. 检查是否有右侧兄弟节点 `node.sibling`：若有，将 `workInProgress` 指向兄弟节点并返回（兄弟节点将作为下一个 unitOfWork 进入 beginWork）。
 * 3. 若无兄弟节点，回溯到父节点 `node = node.return` 继续完成父节点，直到回到根节点。
 *
 * @param fiber 刚完成协调的叶子或子树根节点
 */
function completeUnitOfWork(fiber) {
    let node = fiber;
    do {
        completeWork(node.alternate, node);
        const sibling = node.sibling;
        if (sibling !== null) {
            workInProgress = sibling;
            return;
        }
        node = node.return;
        workInProgress = node;
    } while (node !== null);
}
//# sourceMappingURL=workLoop.js.map