/**
 * Fiber 节点副作用标记 (Fiber Flags / Side-Effect Bitmask)
 *
 * @description
 * 在 Render 协调阶段，Reconciler 发现节点需要新增 DOM、修改属性、删除子节点或触发生命周期 Hook 时，
 * 会在 Fiber 节点的 `flags` 字段打上对应的二进制标记。
 * 在 Commit 阶段，提交器根据这些 flags 精准执行宿主环境的副作用操作。
 */
export type Flags = number;
/** 无任何副作用 */
export declare const NoFlags = 0;
/** 节点插入/移动 (Placement)：表示该节点对应的 DOM 需要挂载或移动位置 */
export declare const Placement = 2;
/** 节点更新 (Update)：表示需要更新 DOM 属性、文本内容或触发 Class 组件生命周期 */
export declare const Update = 4;
/** 子节点删除 (ChildDeletion)：表示当前 Fiber 有子节点需要从真实 DOM 中卸载 */
export declare const ChildDeletion = 8;
/** 被动副作用 (Passive)：包含 `useEffect` 的挂载或销毁逻辑 */
export declare const Passive = 16;
/** Ref 引用副作用 (Ref)：包含 `ref` 的绑定或解绑 */
export declare const Ref = 32;
/** 同步布局副作用 (Layout)：包含 `useLayoutEffect` 的挂载或销毁逻辑 */
export declare const Layout = 64;
/**
 * DOM 突变阶段掩码 (MutationMask)
 * 包含所有需要直接操作浏览器真实 DOM 树的副作用
 */
export declare const MutationMask: number;
/**
 * 异步被动副作用掩码 (PassiveMask)
 * 对应 `useEffect`
 */
export declare const PassiveMask = 16;
/**
 * 同步布局阶段掩码 (LayoutMask)
 * 包含在 DOM 突变后但在浏览器绘制前同步执行的副作用 (`useLayoutEffect`, `Ref`)
 */
export declare const LayoutMask: number;
//# sourceMappingURL=fiberFlags.d.ts.map