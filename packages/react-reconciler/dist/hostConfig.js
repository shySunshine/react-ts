/** 当前处于激活状态的宿主配置实现单例 */
export let hostConfig;
/**
 * 注入宿主环境具体操作实现
 *
 * @callsite 主要调用位置：
 * - 各渲染器包入口（如 `packages/react-dom/src/client.ts`）在模块加载时首先调用。
 *
 * @param config 宿主环境操作集
 */
export function setHostConfig(config) {
    hostConfig = config;
}
//# sourceMappingURL=hostConfig.js.map