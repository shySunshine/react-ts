/**
 * React Scheduler 任务调度优先级定义
 * 
 * @description
 * 调度优先级用于区分不同场景下任务的紧急程度。
 * 数值越小，代表优先级越高，分配的超时时间越短，在任务队列中越先被执行。
 */

/**
 * 优先级级别类型定义
 * 0: NoPriority - 无优先级
 * 1: ImmediatePriority - 同步最高优先级（立即执行）
 * 2: UserBlockingPriority - 用户阻塞级优先级（用户交互，如输入、点击）
 * 3: NormalPriority - 正常优先级（默认，如数据获取、常规渲染）
 * 4: LowPriority - 低优先级（如后台统计、低优渲染）
 * 5: IdlePriority - 空闲优先级（空闲时执行，几乎无阻塞）
 */
export type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * 无优先级（初始状态或未指定）
 */
export const NoPriority: PriorityLevel = 0;

/**
 * 立即执行优先级（最高优先级）
 * 
 * @description
 * 对应超时时间：-1ms（立即过期）。
 * 主要用于必须同步执行的关键任务（如受控表单输入同步刷新）。
 */
export const ImmediatePriority: PriorityLevel = 1;

/**
 * 用户交互阻塞级优先级
 * 
 * @description
 * 对应超时时间：250ms。
 * 用于直接响应用户离散操作（如按钮点击、滚动、拖拽等），需要在极短时间内得到反馈以防止掉帧感。
 */
export const UserBlockingPriority: PriorityLevel = 2;

/**
 * 正常优先级（默认优先级）
 * 
 * @description
 * 对应超时时间：5000ms（5秒）。
 * 用于大多数常规的 UI 渲染和数据更新任务。
 */
export const NormalPriority: PriorityLevel = 3;

/**
 * 低优先级
 * 
 * @description
 * 对应超时时间：10000ms（10秒）。
 * 用于可以延后执行的次要任务（如动画过渡、列表预加载等）。
 */
export const LowPriority: PriorityLevel = 4;

/**
 * 空闲优先级（最低优先级）
 * 
 * @description
 * 对应超时时间：1073741823ms（约 12.4 天，最大 31 位带符号整数）。
 * 只有在主线程完全空闲、没有其他更高优先级任务时才会执行（类似于 requestIdleCallback）。
 */
export const IdlePriority: PriorityLevel = 5;

