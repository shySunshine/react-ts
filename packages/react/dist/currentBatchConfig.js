/**
 * 全局过渡批处理配置单例对象
 *
 * @description
 * 在 `startTransition(scope)` 执行时临时将 `transition` 置为 1，
 * 使 scope 内部触发的所有 setState 在 Reconciler 中被标记为过渡优先级（TransitionLane）。
 */
export const ReactCurrentBatchConfig = {
    transition: null
};
//# sourceMappingURL=currentBatchConfig.js.map