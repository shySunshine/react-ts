import { Dispatcher } from '@react-ts/shared';

/**
 * 当前处于激活状态的 Hooks Dispatcher 桥接单例
 * 
 * @description
 * 在组件渲染前（`renderWithHooks`），Reconciler 会将当前的 Hook 实现（挂载时的 HooksDispatcherOnMount 或更新时的 HooksDispatcherOnUpdate）
 * 注入到 `currentDispatcher.current` 中。
 * 外部调用的 `useState`、`useEffect` 等顶层 API 统一由此单例动态委托执行。
 */
export const currentDispatcher: { current: Dispatcher | null } = {
  current: null
};

/**
 * 解析并获取当前可用的 Dispatcher 实例
 * 
 * @description
 * 校验当前是否处于合法的函数组件渲染生命周期内。
 * 若 `currentDispatcher.current` 为 `null`，说明开发者在组件外、条件判断/循环内违规调用了 Hook，
 * 此时抛出明确的错误以保护 React 的状态调用链完整性。
 * 
 * @callsite 主要调用位置：
 * - `packages/react/src/index.ts` 中所有导出的顶层 Hooks（`useState`, `useEffect`, `useMemo` 等）在执行的第一时间调用此方法。
 * 
 * @returns 当前处于活动状态的 `Dispatcher`
 * @throws 当在非函数组件上下文中调用 Hook 时抛出 Error
 */
export function resolveDispatcher(): Dispatcher {
  const dispatcher = currentDispatcher.current;
  if (dispatcher === null) {
    throw new Error('Hooks 只能在 FunctionComponent 组件主体内调用！');
  }
  return dispatcher;
}

