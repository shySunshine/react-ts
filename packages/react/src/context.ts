import { REACT_CONTEXT_TYPE, REACT_PROVIDER_TYPE, ReactContext } from '@react-ts/shared';

/**
 * 创建一个 React 上下文对象 (Context)
 * 
 * @description
 * 允许在组件树中实现跨层级的数据传递，而无需手动逐层传递 props。
 * 返回的对象包含 `Provider`（提供者组件）和 `Consumer`（消费者组件，也可直接配合 `useContext` 使用）。
 * 
 * @callsite 主要调用位置：
 * - 开发者在应用层创建全局状态共享上下文（如 ThemeContext, AuthContext, RouterContext 等）。
 * 
 * @internal 内部调用的方法及逻辑：
 * 1. 初始化 `context` 对象，设置 `$$typeof = REACT_CONTEXT_TYPE` 与默认值 `_currentValue = defaultValue`。
 * 2. 绑定 `context.Provider`，设置 `$$typeof = REACT_PROVIDER_TYPE` 并将其 `_context` 反向指向 `context`，形成双向关联供 Reconciler 提取上下文值。
 * 3. 将 `context.Consumer` 指向自身 `context`。
 * 
 * @param defaultValue 当组件在上层树中没有找到匹配的 `<Context.Provider>` 时使用的默认值
 * @returns 包含 `Provider` 和 `Consumer` 的 `ReactContext<T>` 上下文对象
 */
export function createContext<T>(defaultValue: T): ReactContext<T> {
  const context: ReactContext<T> = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    Provider: null as any,
    Consumer: null as any
  };

  context.Provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context
  } as any;

  context.Consumer = context;

  return context;
}

