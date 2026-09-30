import { REACT_FORWARD_REF_TYPE } from '@react-ts/shared';
/**
 * 创建一个不可变的 Ref 容器对象 (React.createRef)
 *
 * @description
 * 返回一个包含 `{ current: null }` 的普通 JS 对象。常用于类组件中创建 ref 引用。
 * 在函数组件中通常推荐使用更轻量的 `useRef`。
 *
 * @callsite 主要调用位置：
 * - 开发者在类组件构造函数中初始化 DOM 或实例引用：`this.myRef = React.createRef()`。
 *
 * @returns 包含 `{ current: null }` 的 RefObject
 */
export function createRef() {
    return {
        current: null
    };
}
/**
 * 创建支持 Ref 转发的组件 (React.forwardRef)
 *
 * @description
 * 默认情况下，函数的第一个参数是 props，ref 不会作为 prop 向下传递。
 * `forwardRef` 允许函数组件接收第二个 `ref` 参数，并将其转发给底层的真实 DOM 或子组件。
 *
 * @callsite 主要调用位置：
 * - 基础 UI 组件库（如 Button, Input）需要让使用者直接访问到底层原生 HTML `<button>` 或 `<input>` 元素。
 *
 * @internal 内部调用的方法及逻辑：
 * - 返回带有 `$$typeof: REACT_FORWARD_REF_TYPE` 和 `render` 函数的包装对象。
 *
 * @param render 接收 `(props, ref)` 两个参数的组件渲染函数
 * @returns 带有 REACT_FORWARD_REF_TYPE 标记的 ForwardRefExoticComponent
 */
export function forwardRef(render) {
    return {
        $$typeof: REACT_FORWARD_REF_TYPE,
        render
    };
}
//# sourceMappingURL=ref.js.map