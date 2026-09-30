/**
 * React Fiber 节点工作标签 (WorkTag)
 *
 * @description
 * 每个 FiberNode 内部都有一个 `tag: WorkTag` 属性。
 * Reconciler 在协调阶段（`beginWork` / `completeWork` / `commitWork`）根据 tag 的不同，
 * 走向完全不同的生命周期与协调处理分支（例如函数组件执行 hooks，原生组件操作 DOM，Provider 处理上下文压栈等）。
 */
/** 函数组件 (Function Component) */
export declare const FunctionComponent = 0;
/** 类组件 (Class Component) */
export declare const ClassComponent = 1;
/** 宿主根容器节点 (HostRoot)，对应 ReactDOM.createRoot 创建的根 Fiber */
export declare const HostRoot = 3;
/** 宿主跨 DOM 传送门容器 (HostPortal)，对应 ReactDOM.createPortal */
export declare const HostPortal = 4;
/** 宿主真实 DOM 元素节点 (HostComponent)，如 HTML 的 'div', 'span', 'button' 等 */
export declare const HostComponent = 5;
/** 宿主纯文本节点 (HostText)，对应普通字符串/数字渲染出的 Text 节点 */
export declare const HostText = 6;
/** 片段节点 (Fragment)，对应 `<React.Fragment>` 或 `<>...</>`，不产生真实 DOM 包裹层 */
export declare const Fragment = 7;
/** 上下文提供者组件 (ContextProvider)，对应 `<Context.Provider value={...}>` */
export declare const ContextProvider = 10;
/** Ref 转发组件 (ForwardRef)，对应 `React.forwardRef((props, ref) => ...)` */
export declare const ForwardRef = 11;
/** 记忆化组件 (MemoComponent)，对应 `React.memo(Component)` */
export declare const MemoComponent = 14;
/**
 * 所有合法的 Fiber 节点标签联合类型
 */
export type WorkTag = typeof FunctionComponent | typeof ClassComponent | typeof HostRoot | typeof HostPortal | typeof HostComponent | typeof HostText | typeof Fragment | typeof ContextProvider | typeof ForwardRef | typeof MemoComponent;
//# sourceMappingURL=ReactWorkTags.d.ts.map