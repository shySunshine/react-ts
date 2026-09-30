import {
  PriorityLevel,
  NoPriority,
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority
} from './SchedulerPriorities';
import { Heap, push, pop, peek } from './SchedulerMinHeap';

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
 * 任务队列：使用小顶堆存储所有待执行的任务，堆顶始终是过期时间最小（最紧急）的任务
 */
const taskQueue: Heap<Task> = [];

/** 全局任务自增 ID 计数器 */
let taskIdCounter = 1;
/** 当前正在被执行的任务 */
let currentTask: Task | null = null;
/** 当前正在执行任务的优先级，默认为普通优先级 */
let currentPriorityLevel: PriorityLevel = NormalPriority;

/** 标记是否已向宿主环境申请了调度（避免重复向宏任务队列发送消息） */
let isHostCallbackScheduled = false;
/** 标记当前是否正在执行任务循环 flushWork 中 */
let isPerformingWork = false;
/** 当前时间切片（5ms）的起始时间戳 */
let startTime = -1;
/** 每个时间切片的默认分配时长（毫秒），React 默认设为 5ms 以保证 60fps+ 的丝滑渲染 */
const frameInterval = 5;

/**
 * 获取当前高精度时间戳
 * 
 * @description
 * 使用浏览器提供的 `performance.now()`，精度可达微秒级，用于精确控制 5ms 时间切片。
 */
const getCurrentTime = (): number => performance.now();

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
export function unstable_shouldYield(): boolean {
  return getCurrentTime() - startTime >= frameInterval;
}

/**
 * 基于 MessageChannel 派发的宏任务执行器
 * 
 * @description
 * 优先使用 MessageChannel，因为它在浏览器事件循环中属于宏任务，且没有 setTimeout 嵌套产生的 4ms 强制延迟惩罚。
 * 当宿主环境不支持 MessageChannel 时，降级为 `setTimeout(..., 0)`。
 */
let schedulePerformWorkUntilDeadline: () => void;
if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  schedulePerformWorkUntilDeadline = () => {
    setTimeout(performWorkUntilDeadline, 0);
  };
}

/**
 * 宏任务消息响应函数：在主线程时间片中执行任务直到截止时间
 * 
 * @description
 * MessageChannel 接收到消息后的回调函数。开启一个崭新的 5ms 时间切片并驱动 `flushWork` 执行任务。
 * 
 * @callsite 主要调用位置：
 * - 宿主环境事件循环分发 MessageChannel 消息 (`channel.port1.onmessage`) 或 `setTimeout` 到期时自动调用。
 * 
 * @internal 内部调用的方法及逻辑：
 * 1. 检查 `isHostCallbackScheduled`。
 * 2. 记录时间切片起点 `startTime = getCurrentTime()`。
 * 3. 在 `try...finally` 块中调用 `flushWork(currentTime)` 执行任务。
 * 4. 若 `flushWork` 返回 `true`（表示任务队列尚未清空，仍有剩余任务），则再次调用 `schedulePerformWorkUntilDeadline()` 申请下一个宏任务切片；
 *    若返回 `false`，则说明任务已全部执行完毕，重置 `isHostCallbackScheduled = false`。
 */
function performWorkUntilDeadline() {
  if (isHostCallbackScheduled) {
    const currentTime = getCurrentTime();
    startTime = currentTime;
    let hasMoreWork = true;
    try {
      hasMoreWork = flushWork(currentTime);
    } finally {
      if (hasMoreWork) {
        schedulePerformWorkUntilDeadline();
      } else {
        isHostCallbackScheduled = false;
      }
    }
  }
}

/**
 * 执行并刷新任务队列
 * 
 * @description
 * 封装并保护工作循环，维护执行状态锁 `isPerformingWork`。
 * 
 * @callsite 主要调用位置：
 * - 仅在 `performWorkUntilDeadline` 内部调用。
 * 
 * @internal 内部调用的方法及逻辑：
 * 1. 设置状态 `isPerformingWork = true`。
 * 2. 在 `try...finally` 中调用核心 `workLoop(initialTime)`。
 * 3. 最终清理当前任务指针 `currentTask = null` 并释放状态 `isPerformingWork = false`。
 * 
 * @param initialTime 当前宏任务开始执行的时间戳
 * @returns 布尔值：`true` 表示还有未完成的任务需要下一次切片调度；`false` 表示任务已全部清空。
 */
function flushWork(initialTime: number): boolean {
  isPerformingWork = true;
  try {
    return workLoop(initialTime);
  } finally {
    currentTask = null;
    isPerformingWork = false;
  }
}

/**
 * Scheduler 的核心工作循环 (Work Loop)
 * 
 * @description
 * 遍历并处理 `taskQueue` 堆中的任务。
 * 在每个任务处理前检查其是否过期，若未过期且当前 5ms 时间切片已耗尽，则暂停循环并退出，实现并发让出；
 * 若任务已过期，即使时间切片用尽也会强制同步执行，避免饥饿。
 * 
 * @callsite 主要调用位置：
 * - 仅在 `flushWork` 内部调用。
 * 
 * @internal 内部调用的方法及逻辑：
 * 1. `currentTask = peek(taskQueue)` 获取堆顶最紧急任务。
 * 2. 循环检查：若任务尚未过期 (`expirationTime > currentTime`) 且 `unstable_shouldYield()` 为真，跳出循环。
 * 3. 提取任务的回调函数 `callback`：
 *    - 若 callback 存在：清空 `currentTask.callback = null`（防止重入），更新当前优先级 `currentPriorityLevel`。
 *    - 调用 `callback(didUserCallbackTimeout)` 执行实际业务逻辑（如 Reconciler 的渲染工作）。
 *    - 若回调返回了一个延续函数 (`continuationCallback`)，说明任务未完成（并发中断），将该函数赋回 `currentTask.callback` 并直接返回 `true`（保留在队列中等待下次调度）。
 *    - 若回调未返回函数，说明任务已执行完毕：若堆顶依然是当前任务，则调用 `pop(taskQueue)` 弹出该任务。
 * 4. 若 callback 已经为 null（被 `unstable_cancelCallback` 取消），直接调用 `pop(taskQueue)` 弹出丢弃。
 * 5. 循环结尾通过 `peek(taskQueue)` 提取下一个堆顶任务。
 * 
 * @param initialTime 当前切片开始的时间戳
 * @returns `true` 表示队列中还有未完成的任务；`false` 表示队列已清空。
 */
function workLoop(initialTime: number): boolean {
  let currentTime = initialTime;
  currentTask = peek(taskQueue);

  while (currentTask !== null) {
    if (currentTask.expirationTime > currentTime && unstable_shouldYield()) {
      // 当前任务尚未过期，且 5ms 时间切片已耗尽，暂停工作循环，交还主线程控制权
      break;
    }

    const callback = currentTask.callback;
    if (typeof callback === 'function') {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;

      // 执行任务回调。若返回延续函数，说明是并发中断任务
      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();

      if (typeof continuationCallback === 'function') {
        currentTask.callback = continuationCallback;
        return true;
      } else {
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }
    } else {
      pop(taskQueue);
    }
    currentTask = peek(taskQueue);
  }

  return currentTask !== null;
}

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
export function unstable_scheduleCallback(
  priorityLevel: PriorityLevel,
  callback: Callback
): Task {
  const currentTime = getCurrentTime();
  let timeout: number;

  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = -1;
      break;
    case UserBlockingPriority:
      timeout = 250;
      break;
    case LowPriority:
      timeout = 10000;
      break;
    case IdlePriority:
      timeout = 1073741823; // 最大 31 位有符号整型
      break;
    case NormalPriority:
    default:
      timeout = 5000;
      break;
  }

  const expirationTime = currentTime + timeout;
  const newTask: Task = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime: currentTime,
    expirationTime,
    sortIndex: expirationTime
  };

  push(taskQueue, newTask);

  if (!isHostCallbackScheduled && !isPerformingWork) {
    isHostCallbackScheduled = true;
    schedulePerformWorkUntilDeadline();
  }

  return newTask;
}

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
export function unstable_cancelCallback(task: Task): void {
  task.callback = null;
}

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
export function unstable_getCurrentPriorityLevel(): PriorityLevel {
  return currentPriorityLevel;
}

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
export function unstable_runWithPriority<T>(
  priorityLevel: PriorityLevel,
  fn: () => T
): T {
  const previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;
  try {
    return fn();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

