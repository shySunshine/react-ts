/**
 * React 批处理与过渡更新配置 (BatchConfig)
 *
 * @description
 * 用于追踪当前执行上下文中是否嵌套处于 `startTransition` 或 `useTransition` 的回调中。
 */
export interface BatchConfig {
    /**
     * 标记当前 Transition 优先级。
     * 非 null（如数值 1）表示当前正在触发 transition 更新，更新产生对应的 TransitionLane 优先级；
     * 为 null 表示当前为普通或同步更新。
     */
    transition: number | null;
}
/**
 * 全局过渡批处理配置单例对象
 *
 * @description
 * 在 `startTransition(scope)` 执行时临时将 `transition` 置为 1，
 * 使 scope 内部触发的所有 setState 在 Reconciler 中被标记为过渡优先级（TransitionLane）。
 */
export declare const ReactCurrentBatchConfig: BatchConfig;
//# sourceMappingURL=currentBatchConfig.d.ts.map