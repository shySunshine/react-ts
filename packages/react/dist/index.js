import { createElement } from './jsx';
import { resolveDispatcher } from './currentDispatcher';
import { ReactCurrentBatchConfig } from './currentBatchConfig';
import { REACT_FRAGMENT_TYPE } from '@react-ts/shared';
import { memo } from './memo';
import { createContext } from './context';
import { forwardRef, createRef } from './ref';
import { cloneElement, isValidElement } from './cloneElement';
import { Children } from './children';
export * from './jsx';
export * from './memo';
export * from './context';
export * from './ref';
export * from './cloneElement';
export * from './children';
export { currentDispatcher } from './currentDispatcher';
export { ReactCurrentBatchConfig } from './currentBatchConfig';
/** React.Fragment 占位组件标识 */
export const Fragment = REACT_FRAGMENT_TYPE;
/**
 * 声明组件内部响应式状态的 Hook (useState)
 *
 * @description
 * 接收初始状态（或惰性初始计算函数），返回当前状态值与状态更新函数 `[state, setState]`。
 *
 * @callsite 主要调用位置：
 * - 函数组件内部声明局部响应式状态。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useState(initialState)`。
 *
 * @param initialState 初始状态值或惰性初始化函数 `() => initialState`
 * @returns 包含当前状态与派发函数的二元元组 `[S, Dispatch<Action<S>>]`
 */
export function useState(initialState) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useState(initialState);
}
/**
 * 具有复杂状态逻辑的状态管理 Hook (useReducer)
 *
 * @description
 * 接收 reducer 函数与初始参数，返回 `[state, dispatch]`。类似于 Redux 的单向数据流。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useReducer(reducer, initialArg, init)`。
 *
 * @param reducer 纯函数 `(state, action) => newState`
 * @param initialArg 初始值
 * @param init 可选的惰性初始化转换函数
 * @returns `[state, dispatch]`
 */
export function useReducer(reducer, initialArg, init) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useReducer(reducer, initialArg, init);
}
/**
 * 声明异步副作用的 Hook (useEffect)
 *
 * @description
 * 在组件渲染完成、DOM 突变并经过浏览器绘制后异步执行。
 * 适用于数据请求、手动订阅、定时器与事件监听等操作。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useEffect(create, deps)`。
 *
 * @param create 副作用回调函数，可返回一个清理函数 `() => void`
 * @param deps 依赖项数组；若不传则每次渲染都执行，若传空数组 `[]` 则仅在挂载时执行
 */
export function useEffect(create, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useEffect(create, deps);
}
/**
 * 声明布局副作用的 Hook (useLayoutEffect)
 *
 * @description
 * 在 DOM 变更后但在浏览器绘制（paint）之前同步执行。
 * 适用于读取 DOM 几何布局信息（如 `getBoundingClientRect`）并同步触发重渲染以避免闪烁。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useLayoutEffect(create, deps)`。
 *
 * @param create 布局副作用回调函数
 * @param deps 依赖项数组
 */
export function useLayoutEffect(create, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useLayoutEffect(create, deps);
}
/**
 * 在 DOM 突变前同步触发的 Hook (useInsertionEffect)
 *
 * @description
 * 执行时机早于 `useLayoutEffect`，在所有 DOM 变更应用前同步执行，
 * 专门供 CSS-in-JS 库（如 styled-components, emotion）注入 `<style>` 标签，避免布局抖动。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useInsertionEffect(create, deps)`。
 */
export function useInsertionEffect(create, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useInsertionEffect(create, deps);
}
/**
 * 声明可变引用对象的 Hook (useRef)
 *
 * @description
 * 返回一个固定的引用对象 `{ current: initialValue }`，在组件的整个生命周期中该对象引用保持不变。
 * 修改 `.current` 属性不会触发组件重新渲染。常用于保存真实 DOM 节点或跨渲染周期的可变变量。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useRef(initialValue)`。
 *
 * @param initialValue 初始值
 * @returns `{ current: T }`
 */
export function useRef(initialValue) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useRef(initialValue);
}
/**
 * 缓存复杂计算结果的 Hook (useMemo)
 *
 * @description
 * 仅在依赖项数组 `deps` 中的某项发生浅变更时才重新执行计算函数，否则返回上一次缓存的计算结果。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useMemo(create, deps)`。
 *
 * @param create 计算工厂函数
 * @param deps 依赖项数组
 * @returns 缓存的计算结果
 */
export function useMemo(create, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useMemo(create, deps);
}
/**
 * 缓存回调函数实例的 Hook (useCallback)
 *
 * @description
 * 仅在依赖项发生变化时才返回新的函数引用，避免将新函数作为 prop 传递导致使用了 `React.memo` 的子组件无效重渲染。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useCallback(callback, deps)`。
 *
 * @param callback 目标回调函数
 * @param deps 依赖项数组
 * @returns 缓存的稳定函数引用
 */
export function useCallback(callback, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useCallback(callback, deps);
}
/**
 * 声明并发非阻塞过渡状态的 Hook (useTransition)
 *
 * @description
 * 用于将某些耗时或非紧急的状态更新标记为低优过渡更新（Transition），保持界面的高响应性与流畅度。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useTransition()`。
 *
 * @returns `[isPending, startTransition]`：isPending 标识过渡是否在进行中，startTransition 用于包裹低优更新回调。
 */
export function useTransition() {
    const dispatcher = resolveDispatcher();
    return dispatcher.useTransition();
}
/**
 * 订阅并读取 React Context 的 Hook (useContext)
 *
 * @description
 * 接收一个由 `createContext` 创建的上下文对象，返回最近上层 `<Context.Provider>` 提供的当前 `value`。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useContext(context)`。
 *
 * @param context 目标上下文对象
 * @returns 当前上下文的值
 */
export function useContext(context) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useContext(context);
}
/**
 * 自定义由 ref 暴露给父组件实例值的 Hook (useImperativeHandle)
 *
 * @description
 * 配合 `forwardRef` 使用，允许子组件限制或定制暴露给父级 ref 的方法与属性，而不是直接暴露原生 DOM。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useImperativeHandle(ref, init, deps)`。
 */
export function useImperativeHandle(ref, init, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useImperativeHandle(ref, init, deps);
}
/**
 * 生成在客户端与服务端之间唯一且稳定 ID 的 Hook (useId)
 *
 * @description
 * 用于无障碍属性（如 `aria-describedby`、表单 `htmlFor`）的关联，确保在并发渲染和 SSR 水合过程中生成的 ID 绝对一致。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useId()`。
 *
 * @returns 唯一的字符串 ID
 */
export function useId() {
    const dispatcher = resolveDispatcher();
    return dispatcher.useId();
}
/**
 * 订阅外部状态存储的 Hook (useSyncExternalStore)
 *
 * @description
 * React 18 推荐用于集成第三方状态管理库（Redux, Zustand, 自定义 Store）的官方 API。
 * 保证在并发渲染时间切片下读取外部数据源不会出现“撕裂（Tearing）”不一致现象。
 *
 * @internal 内部调用的方法及逻辑：
 * - 委托调用 `resolveDispatcher().useSyncExternalStore(...)`。
 */
export function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
/**
 * 开启一个非阻塞的过渡更新作用域 (startTransition)
 *
 * @description
 * 将回调函数 `scope` 中的所有状态更新（如 `setState`）标记为并发过渡更新（Transition 优先级）。
 * 在并发模式下，过渡更新不会阻塞紧急的高优交互（如输入、滚动），并可在新内容准备就绪前保持旧界面可交互。
 *
 * @callsite 主要调用位置：
 * - 开发者在事件处理器中包裹路由切换、长列表搜索过滤等耗时渲染。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 保存旧的批处理配置 `prevTransition = ReactCurrentBatchConfig.transition`。
 * 2. 标记开启 `ReactCurrentBatchConfig.transition = 1`。
 * 3. 在 `try...finally` 中执行 `scope()`。
 * 4. 恢复 `ReactCurrentBatchConfig.transition = prevTransition`。
 *
 * @param scope 包含状态更新调用的同步回调函数
 */
export function startTransition(scope) {
    const prevTransition = ReactCurrentBatchConfig.transition;
    // 标记处于 Transition 上下文中 (1 表示开启)
    ReactCurrentBatchConfig.transition = 1;
    try {
        scope();
    }
    finally {
        ReactCurrentBatchConfig.transition = prevTransition;
    }
}
/**
 * 默认导出的 React 顶级命名空间对象
 */
const React = {
    createElement,
    Fragment,
    memo,
    createContext,
    forwardRef,
    createRef,
    cloneElement,
    isValidElement,
    Children,
    useState,
    useReducer,
    useEffect,
    useLayoutEffect,
    useInsertionEffect,
    useRef,
    useMemo,
    useCallback,
    useTransition,
    useContext,
    useImperativeHandle,
    useId,
    useSyncExternalStore,
    startTransition
};
export default React;
//# sourceMappingURL=index.js.map