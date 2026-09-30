import { ImmediatePriority, UserBlockingPriority, NormalPriority, IdlePriority } from '@react-ts/scheduler';
import { ReactCurrentBatchConfig } from '@react-ts/react';
/** 无车道 / 空车道集合 */
export const NoLanes = 0b0000000000000000000000000000000;
export const NoLane = 0b0000000000000000000000000000000;
/** 同步紧急车道（如离散用户交互初始状态、flushSync 同步更新），超时时间最短 */
export const SyncLane = 0b0000000000000000000000000000001; // 1
/** 连续用户交互车道（如 mousemove, scroll, touchmove） */
export const InputContinuousLane = 0b0000000000000000000000000000010; // 2
/** 默认更新车道（普通的 useState/setState 更新） */
export const DefaultLane = 0b0000000000000000000000000000100; // 4
/** 过渡更新车道 1 (useTransition / startTransition) */
export const TransitionLane1 = 0b0000000000000000000000000001000; // 8
/** 过渡更新车道 2 */
export const TransitionLane2 = 0b0000000000000000000000000010000; // 16
/** 所有过渡车道集合掩码（覆盖 1~16 个 TransitionLanes） */
export const TransitionLanes = 0b0000000001111111111111111111000;
/** 空闲车道（最低优先级，主线程完全无任务时才执行） */
export const IdleLane = 0b0100000000000000000000000000000;
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
export function getHighestPriorityLane(lanes) {
    return lanes & -lanes;
}
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
export function isSubsetOfLanes(set, subset) {
    return (set & subset) === subset;
}
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
export function mergeLanes(a, b) {
    return a | b;
}
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
export function removeLanes(set, subset) {
    return set & ~subset;
}
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
export function lanesToSchedulerPriority(lanes) {
    const lane = getHighestPriorityLane(lanes);
    if (lane === SyncLane) {
        return ImmediatePriority;
    }
    if (lane === InputContinuousLane) {
        return UserBlockingPriority;
    }
    if (lane === DefaultLane || (lane & TransitionLanes) !== NoLanes) {
        return NormalPriority;
    }
    if (lane === IdleLane) {
        return IdlePriority;
    }
    return NormalPriority;
}
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
export function requestUpdateLane() {
    const isTransition = ReactCurrentBatchConfig.transition !== null;
    if (isTransition) {
        // 处于 startTransition 作用域内，分配 TransitionLane
        return TransitionLane1;
    }
    // 默认为 DefaultLane (在事件系统中可通过上下文临时切换为 SyncLane)
    return DefaultLane;
}
//# sourceMappingURL=fiberLane.js.map