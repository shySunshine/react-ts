import { PriorityLevel } from './SchedulerPriorities';
export * from './SchedulerPriorities';
/**
 * 任务回调函数签名
 *
 * @param didUserCallbackTimeout 是否因为任务已超时而强制执行（若为 true 说明已过期）
 * @returns 若返回一个函数，则表明任务尚未完成，该返回函数将作为“延续任务（continuationCallback）”保留在队列中继续等待调度；若返回 null 或 void 则表示任务彻底完成。
 */
export type Callback = (didUserCallbackTimeout: boolean) => Callback | null | void;
/**
 * Scheduler 内部调度的任务单元 (Task)
 */
export interface Task {
    /** 任务全局自增唯一 ID */
    id: number;
    /** 实际待执行的回调函数。若为 null 表示该任务已被取消 */
    callback: Callback | null;
    /** 任务的优先级级别 */
    priorityLevel: PriorityLevel;
    /** 任务开始/创建的时间戳 (毫秒) */
    startTime: number;
    /** 任务必须被执行的过期截止时间戳 (毫秒) = startTime + timeout */
    expirationTime: number;
    /** 对应 MinHeap 中的排序依据，在普通任务队列中等于 expirationTime */
    sortIndex: number;
}
/**
 * 协作式让出机制：判断当前时间切片是否已耗尽
 *
 * @description
 * 检查当前任务执行所消耗的时间是否超过了预设的 5ms 帧切片间隔。
 *
 * @callsite 主要调用位置：
 * - 在 `packages/scheduler/src/index.ts` 的 `workLoop` 中调用：
 *   每处理完一个小单元或循环检查时，判断是否需要暂停让出主线程。
 * - 在 React Reconciler 的并发工作循环 `workLoopConcurrent` (`packages/react-reconciler/src/workLoop.ts`) 中调用：
 *   在 Fiber 树遍历过程中，决定是否中断并保存现场。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 调用 `getCurrentTime()` 获取当前时间戳。
 * 2. 计算 `currentTime - startTime` 是否 `>= frameInterval` (5ms)。
 *
 * @returns `true` 表示时间切片耗尽，需要让出主线程给浏览器绘制/响应用户交互；`false` 表示时间充裕，可继续执行工作。
 */
export declare function unstable_shouldYield(): boolean;
/**
 * 调度核心入口：向调度器注册一个新的异步回调任务
 *
 * @description
 * 根据指定的优先级计算出任务的超时时间（timeout）与绝对过期时间（expirationTime），
 * 构建 Task 任务对象，放入小顶堆 `taskQueue`，并在需要时启动宿主宏任务调度。
 *
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/workLoop.ts` 中的 `ensureRootIsScheduled`：
 *   当 React 树产生更新（setState、createRoot.render 等）时，Reconciler 将根节点的协调工作作为任务提交给 Scheduler 进行并发/时间切片调度。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 调用 `getCurrentTime()` 获取当前时间戳。
 * 2. 根据 `priorityLevel` switch-case 匹配超时时长 timeout：
 *    - `ImmediatePriority` -> -1ms
 *    - `UserBlockingPriority` -> 250ms
 *    - `LowPriority` -> 10000ms
 *    - `IdlePriority` -> 1073741823ms
 *    - `NormalPriority` (默认) -> 5000ms
 * 3. 计算 `expirationTime = currentTime + timeout`。
 * 4. 组装 `newTask: Task`，其中 `sortIndex = expirationTime`。
 * 5. 调用 `push(taskQueue, newTask)` 将任务插入小顶堆并维护堆序。
 * 6. 检查 `!isHostCallbackScheduled && !isPerformingWork`，若未开启宏任务调度，则置为 true 并调用 `schedulePerformWorkUntilDeadline()`。
 *
 * @param priorityLevel 任务优先级
 * @param callback 任务执行的回调函数
 * @returns 返回构建好的 `Task` 对象，可用于后续取消任务
 */
export declare function unstable_scheduleCallback(priorityLevel: PriorityLevel, callback: Callback): Task;
/**
 * 取消一个已调度的任务
 *
 * @description
 * 将任务的 `callback` 置为 `null`。在后续 `workLoop` 遍历到该任务时，会直接将其从堆中弹出并丢弃。
 *
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/workLoop.ts` 中的 `ensureRootIsScheduled`：
 *   当有更高优先级的任务插入，或者当前调度的任务不再需要时，调用此函数取消之前的调度任务。
 *
 * @internal 内部调用的方法及逻辑：
 * - 直接将 `task.callback = null`。
 *
 * @param task 待取消的任务对象
 */
export declare function unstable_cancelCallback(task: Task): void;
/**
 * 获取当前正在执行的任务的优先级级别
 *
 * @description
 * 返回全局变量 `currentPriorityLevel`，用于让调用方了解当前上下文的调度优先级。
 *
 * @callsite 主要调用位置：
 * - 在 Reconciler 或外部代码需要感知当前处于何种优先级时调用。
 *
 * @returns 当前任务的 `PriorityLevel`
 */
export declare function unstable_getCurrentPriorityLevel(): PriorityLevel;
/**
 * 在指定的优先级上下文中同步执行一个函数
 *
 * @description
 * 保存旧的当前优先级，将 `currentPriorityLevel` 临时切换为指定的 `priorityLevel`，
 * 执行目标函数后在 `finally` 块中恢复旧的优先级并返回执行结果。
 *
 * @callsite 主要调用位置：
 * - 批量更新或特定优先级执行区，如在更高/更低优先级下运行某段计算逻辑。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 保存 `const previousPriorityLevel = currentPriorityLevel`。
 * 2. 覆盖 `currentPriorityLevel = priorityLevel`。
 * 3. 执行 `fn()`，在 `finally` 中恢复 `currentPriorityLevel = previousPriorityLevel`。
 *
 * @param priorityLevel 要切换的目标优先级
 * @param fn 在该优先级下执行的同步函数
 * @returns 目标函数 `fn` 的返回值
 */
export declare function unstable_runWithPriority<T>(priorityLevel: PriorityLevel, fn: () => T): T;
//# sourceMappingURL=index.d.ts.map