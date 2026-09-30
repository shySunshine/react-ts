import { ReactContext } from '@react-ts/shared';

/** 模拟 Context 值的栈结构游标数组，用于支持 Provider 的嵌套与退栈恢复 */
const valueCursor: any[] = [];
let cursorIndex = -1;

/**
 * Context 提供者入栈 (pushProvider)
 * 
 * @description
 * 当协调器遍历进入 `<Context.Provider value={nextValue}>` 节点时调用：
 * 将旧的 `context._currentValue` 压入栈中保存，并将 `context._currentValue` 覆写为 `nextValue`。
 * 
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/beginWork.ts`：处理 ContextProvider 类型的 Fiber 节点时。
 * 
 * @param context 目标上下文对象
 * @param nextValue 本次 Provider 传递的新值
 */
export function pushProvider<T>(context: ReactContext<T>, nextValue: T): void {
  cursorIndex++;
  valueCursor[cursorIndex] = context._currentValue;
  context._currentValue = nextValue;
}

/**
 * Context 提供者出栈 (popProvider)
 * 
 * @description
 * 当协调器完成 `<Context.Provider>` 子树的协调、回溯离开时调用：
 * 从栈顶弹出之前保存的旧值，恢复 `context._currentValue`。
 * 
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/completeWork.ts`：回溯完成 ContextProvider 节点时。
 * 
 * @param context 目标上下文对象
 */
export function popProvider<T>(context: ReactContext<T>): void {
  if (cursorIndex < 0) {
    return;
  }
  context._currentValue = valueCursor[cursorIndex];
  valueCursor[cursorIndex] = null;
  cursorIndex--;
}

/**
 * 读取当前上下文值 (readContext)
 * 
 * @description
 * 在函数组件或 Consumer 中消费 Context 时调用，直接返回 `context._currentValue`。
 * 
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/fiberHooks.ts` 中的 `useContext` 实现。
 * 
 * @param context 目标上下文对象
 * @returns 当前上下文中生效的值
 */
export function readContext<T>(context: ReactContext<T>): T {
  return context._currentValue;
}

