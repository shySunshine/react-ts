/** 无任何副作用 */
export const NoFlags = 0b000000000000;
/** 节点插入/移动 (Placement)：表示该节点对应的 DOM 需要挂载或移动位置 */
export const Placement = 0b000000000010; // 2
/** 节点更新 (Update)：表示需要更新 DOM 属性、文本内容或触发 Class 组件生命周期 */
export const Update = 0b000000000100; // 4
/** 子节点删除 (ChildDeletion)：表示当前 Fiber 有子节点需要从真实 DOM 中卸载 */
export const ChildDeletion = 0b000000001000; // 8
/** 被动副作用 (Passive)：包含 `useEffect` 的挂载或销毁逻辑 */
export const Passive = 0b000000010000; // 16
/** Ref 引用副作用 (Ref)：包含 `ref` 的绑定或解绑 */
export const Ref = 0b000000100000; // 32
/** 同步布局副作用 (Layout)：包含 `useLayoutEffect` 的挂载或销毁逻辑 */
export const Layout = 0b000001000000; // 64
/**
 * DOM 突变阶段掩码 (MutationMask)
 * 包含所有需要直接操作浏览器真实 DOM 树的副作用
 */
export const MutationMask = Placement | Update | ChildDeletion | Ref;
/**
 * 异步被动副作用掩码 (PassiveMask)
 * 对应 `useEffect`
 */
export const PassiveMask = Passive;
/**
 * 同步布局阶段掩码 (LayoutMask)
 * 包含在 DOM 突变后但在浏览器绘制前同步执行的副作用 (`useLayoutEffect`, `Ref`)
 */
export const LayoutMask = Layout | Ref;
//# sourceMappingURL=fiberFlags.js.map