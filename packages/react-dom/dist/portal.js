import { REACT_PORTAL_TYPE } from '@react-ts/shared';
/**
 * 创建传送门节点 (ReactDOM.createPortal)
 *
 * @description
 * 将子节点渲染到存在于父组件 DOM 层次结构之外的指定 DOM 节点中（例如 document.body 或特定的 Modal 挂载容器），
 * 但在 React 的 Fiber 树中仍保留其父子上下文关系与事件冒泡机制。
 *
 * @callsite 主要调用位置：
 * - 模态弹窗 (Modal)、浮层 (Popover)、全局轻提示 (Tooltip) 等脱离常规 DOM 布局流的组件。
 *
 * @internal 内部调用的方法及逻辑：
 * - 返回带有 `$$typeof: REACT_PORTAL_TYPE`、`containerInfo: container` 的特殊 ReactElement。
 *
 * @param children 任意可渲染的 React 子节点
 * @param container 目标 DOM 挂载容器节点
 * @param key 可选的唯一 key 标识
 * @returns 带有 REACT_PORTAL_TYPE 标记的 ReactElement
 */
export function createPortal(children, container, key = null) {
    return {
        $$typeof: REACT_PORTAL_TYPE,
        type: REACT_PORTAL_TYPE,
        key: key !== null ? '' + key : null,
        ref: null,
        props: {
            children,
            containerInfo: container
        },
        containerInfo: container
    };
}
//# sourceMappingURL=portal.js.map