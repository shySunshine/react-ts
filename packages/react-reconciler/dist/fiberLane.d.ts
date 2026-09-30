import { PriorityLevel } from '@react-ts/scheduler';
/**
 * 31 位二进制位掩码 Lane 车道模型 (React 18 Lane Model)
 *
 * @description
 * 在 React 18 中，更新的优先级不再是一个离散的单一枚举，而是采用 31 位二进制位掩码（Bitmask）表示的“车道（Lane）”。
 * 特点：
 * 1. 数值越小（二进制 1 越靠右），代表优先级越高。
 * 2. 支持批处理表达：`Lanes` 可以通过按位或（`|`）同时容纳多个不同优先级的任务。
 * 3. 位运算极其高效：提取最高优先级仅需单条指令 `lanes & -lanes`。
 */
export type Lane = number;
export type Lanes = number;
/** 无车道 / 空车道集合 */
export declare const NoLanes: Lanes;
export declare const NoLane: Lane;
/** 同步紧急车道（如离散用户交互初始状态、flushSync 同步更新），超时时间最短 */
export declare const SyncLane: Lane;
/** 连续用户交互车道（如 mousemove, scroll, touchmove） */
export declare const InputContinuousLane: Lane;
/** 默认更新车道（普通的 useState/setState 更新） */
export declare const DefaultLane: Lane;
/** 过渡更新车道 1 (useTransition / startTransition) */
export declare const TransitionLane1: Lane;
/** 过渡更新车道 2 */
export declare const TransitionLane2: Lane;
/** 所有过渡车道集合掩码（覆盖 1~16 个 TransitionLanes） */
export declare const TransitionLanes: Lanes;
/** 空闲车道（最低优先级，主线程完全无任务时才执行） */
export declare const IdleLane: Lane;
/**
 * 提取当前车道集合中优先级最高的一个车道
 *
 * @description
 * 算法原理：利用计算机补码特性，`lanes & -lanes` 可以在 $O(1)$ 时间内精准提取二进制中最右侧的第一个 `1`（即最低有效位 Least Significant Bit）。
 * 因为数值越小优先级越高，所以最右侧的 1 即为当前集合中优先级最高的车道。
 *
 * @callsite 主要调用位置：
 * - `lanesToSchedulerPriority`：将待处理车道转换为调度器优先级。
 * - `workLoop.ts`：在开启并发渲染前确定当前批次渲染的目标车道 `renderLane`。
 *
 * @param lanes 车道集合
 * @returns 优先级最高的那单一 Lane
 */
export declare function getHighestPriorityLane(lanes: Lanes): Lane;
/**
 * 判断指定车道或车道集合是否是目标集合的子集
 *
 * @description
 * 利用按位与运算 `(set & subset) === subset`。
 *
 * @param set 包含全集车道的 Lanes
 * @param subset 待检验的子集 Lane 或 Lanes
 * @returns `true` 表示 subset 完全包含在 set 中
 */
export declare function isSubsetOfLanes(set: Lanes, subset: Lane | Lanes): boolean;
/**
 * 合并两个车道集合
 *
 * @description
 * 执行按位或运算 `a | b`。
 *
 * @param a 车道集合 A
 * @param b 车道集合 B
 * @returns 合并后的车道集合
 */
export declare function mergeLanes(a: Lanes, b: Lanes): Lanes;
/**
 * 从车道集合中剔除指定的车道
 *
 * @description
 * 执行按位与反运算 `set & ~subset`。
 *
 * @param set 原始车道集合
 * @param subset 待移除的车道
 * @returns 移除后的车道集合
 */
export declare function removeLanes(set: Lanes, subset: Lane | Lanes): Lanes;
/**
 * 将 Reconciler 的 Lane 车道转换为 Scheduler 调度器的优先级级别 (PriorityLevel)
 *
 * @description
 * 协调器（Reconciler）使用细粒度的 Lane 模型管理组件更新；
 * 调度器（Scheduler）使用宏观的 PriorityLevel 控制宏任务超时与时间切片。
 * 此函数是两个核心系统之间的桥梁。
 *
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/workLoop.ts` 中的 `ensureRootIsScheduled`：
 *   在向 Scheduler 注册异步调度任务时，根据根节点的待处理车道映射出对应的调度优先级。
 *
 * @param lanes 当前待调度的车道集合
 * @returns 对应的 Scheduler PriorityLevel
 */
export declare function lanesToSchedulerPriority(lanes: Lanes): PriorityLevel;
/**
 * 请求当前操作应被赋予的更新车道 (Lane)
 *
 * @description
 * 检查当前运行时上下文：
 * - 若处于 `startTransition` 作用域内，分配 `TransitionLane1`；
 * - 否则默认为普通更新 `DefaultLane`。
 *
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/index.ts` 中的 `updateContainer`（应用根渲染）。
 * - `packages/react-reconciler/src/fiberHooks.ts` 中的 `dispatchSetState`（组件触发状态更新）。
 *
 * @returns 当前更新应使用的 Lane
 */
export declare function requestUpdateLane(): Lane;
//# sourceMappingURL=fiberLane.d.ts.map