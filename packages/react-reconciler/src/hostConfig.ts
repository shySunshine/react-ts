/**
 * 宿主环境抽象契约接口 (HostConfig)
 * 
 * @description
 * React Reconciler 是与平台无关的协调内核。
 * 所有涉及具体平台（浏览器 DOM、移动端原生视图 React Native、三维场景 Three.js 等）的操作，
 * 均通过此接口进行抽象隔离，由对应渲染器在启动时通过 `setHostConfig` 动态注入。
 */
export interface HostConfig {
  /** 创建真实宿主节点实例（如 document.createElement） */
  createInstance: (type: string, props: any) => any;
  /** 在离屏构建阶段追加子节点 */
  appendInitialChild: (parent: any, child: any) => void;
  /** 创建文本节点（如 document.createTextNode） */
  createTextInstance: (content: string | number) => any;
  /** 将子节点追加到顶层挂载容器中 */
  appendChildToContainer: (container: any, child: any) => void;
  /** 提交节点属性更新 */
  commitUpdate: (fiber: any) => void;
  /** 提交文本内容更新 */
  commitTextUpdate: (textInstance: any, content: string | number) => void;
  /** 从父节点中删除指定子节点 */
  removeChild: (parent: any, child: any) => void;
  /** 将子节点插入到指定兄弟节点之前 */
  insertChildToContainer: (container: any, child: any, before: any) => void;
}

/** 当前处于激活状态的宿主配置实现单例 */
export let hostConfig: HostConfig;

/**
 * 注入宿主环境具体操作实现
 * 
 * @callsite 主要调用位置：
 * - 各渲染器包入口（如 `packages/react-dom/src/client.ts`）在模块加载时首先调用。
 * 
 * @param config 宿主环境操作集
 */
export function setHostConfig(config: HostConfig) {
  hostConfig = config;
}

