/**
 * React 核心内部 Symbol 标识定义
 *
 * @description
 * React 使用 `Symbol.for` 创建唯一的内建标识符，用于在运行时区分不同类型的 React 节点（如 Element、Fragment、Portal 等）。
 *
 * 安全特性说明：
 * 经典的 XSS 攻击可能会通过伪造 JSON 数据注入类似 `{ type: 'div', props: { dangerouslySetInnerHTML: ... } }` 的对象。
 * 由于 JSON 规范不支持 Symbol 类型，React 在每个合法 Element 上打上 `$$typeof: REACT_ELEMENT_TYPE`。
 * 当恶意 JSON 传入时，其 `$$typeof` 无法为真正的 Symbol，从而在源头阻止了客户端原型链/数据层面的跨站脚本注入。
 */
/**
 * ReactElement 对象的标识符
 *
 * @description
 * 每个通过 `jsx` / `createElement` 创建出的虚拟 DOM 节点均具备 `$$typeof: REACT_ELEMENT_TYPE`。
 */
export declare const REACT_ELEMENT_TYPE: symbol;
/**
 * React.Fragment 组件的标识符
 *
 * @description
 * 用于无额外 DOM 包装的多子节点包裹组件 `<React.Fragment>` 或 `<>...</>`。
 */
export declare const REACT_FRAGMENT_TYPE: symbol;
/**
 * ReactDOM.createPortal 传送门节点的标识符
 *
 * @description
 * 用于跨 DOM 层级挂载子节点的 Portal 容器对象标识。
 */
export declare const REACT_PORTAL_TYPE: symbol;
/**
 * React.Suspense 组件的标识符
 *
 * @description
 * 用于异步加载与流式 SSR 的 Suspense 边界组件标识。
 */
export declare const REACT_SUSPENSE_TYPE: symbol;
/**
 * React.memo 高阶组件包装对象的标识符
 *
 * @description
 * 标记该组件具备浅比较 props 的记忆化优化能力。
 */
export declare const REACT_MEMO_TYPE: symbol;
/**
 * React.createContext 返回的 Context 对象标识符
 *
 * @description
 * 标识上下文对象本身（包含 Consumer、_currentValue 等）。
 */
export declare const REACT_CONTEXT_TYPE: symbol;
/**
 * Context.Provider 组件的标识符
 *
 * @description
 * 标识上下文提供者组件 `<Context.Provider value={...}>`。
 */
export declare const REACT_PROVIDER_TYPE: symbol;
/**
 * React.forwardRef 包装组件的标识符
 *
 * @description
 * 标识支持向子组件透传 ref 的 ForwardRef 特殊组件。
 */
export declare const REACT_FORWARD_REF_TYPE: symbol;
//# sourceMappingURL=ReactSymbols.d.ts.map