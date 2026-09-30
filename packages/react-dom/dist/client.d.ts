import { ReactElement } from '@react-ts/shared';
/**
 * ReactDOMRoot 实例接口
 */
export interface RootType {
    /**
     * 将 ReactElement 渲染或更新到容器中
     *
     * @param element 待挂载/更新的 ReactElement（或 null）
     */
    render(element: ReactElement | null): void;
}
/**
 * 创建 React 18 并发渲染根容器 (ReactDOM.createRoot)
 *
 * @description
 * 应用初始化的主入口。接收一个真实的 DOM 容器元素，初始化根级合成事件代理，
 * 并调用 Reconciler 创建 FiberRootNode，返回包含 `render` 方法的根控制器。
 *
 * @callsite 主要调用位置：
 * - 应用入口文件（如 `main.tsx` / `index.tsx`）：`createRoot(document.getElementById('root')!).render(<App />)`。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 校验 `container` 是否为有效的 DOM Element（`nodeType === 1`）或 DocumentFragment（`nodeType === 11`）。
 * 2. 调用 `initAllEvents(container)`：在根 DOM 节点上统一挂载所有支持的原生事件监听器（合成事件代理）。
 * 3. 调用 `createContainer(container)`：委托 Reconciler 创建底层的 `FiberRootNode` 及根 Fiber。
 * 4. 返回包含 `render(element)` 方法的 `RootType` 对象。调用 `render` 时内部委托 `updateContainer(element, root)` 启动调度更新。
 *
 * @param container 目标 DOM 挂载容器
 * @returns 包含 `render` 方法的 `RootType` 根实例
 * @throws 若 container 非法时抛出 Error
 */
export declare function createRoot(container: Element | DocumentFragment): RootType;
declare const client: {
    createRoot: typeof createRoot;
};
export default client;
//# sourceMappingURL=client.d.ts.map