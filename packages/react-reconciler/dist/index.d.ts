import { ReactElement } from '@react-ts/shared';
import { FiberRootNode } from './fiber';
export * from './fiber';
export * from './fiberFlags';
export * from './fiberLane';
export * from './hostConfig';
/**
 * 创建应用根协调容器 (createContainer)
 *
 * @description
 * 初始化应用的根节点体系：
 * 1. 创建 tag 为 `HostRoot` 的根 Fiber 节点 (`hostRootFiber`)。
 * 2. 创建整个应用唯一的统筹根节点 `FiberRootNode`。
 * 3. 为根 Fiber 初始化一个空的更新队列 `updateQueue`。
 *
 * @callsite 主要调用位置：
 * - `packages/react-dom/src/client.ts` 中的 `createRoot`。
 *
 * @param container 宿主环境的根挂载容器（如 document.getElementById('root')）
 * @returns 初始化完毕的 `FiberRootNode`
 */
export declare function createContainer(container: any): FiberRootNode;
/**
 * 调度更新根容器内容 (updateContainer)
 *
 * @description
 * 将新的 ReactElement 蓝图推入根节点的更新队列，并向调度循环申请协调更新。
 *
 * @callsite 主要调用位置：
 * - `ReactDOMRoot.render`：应用首次挂载渲染或后续通过 root.render 整体替换。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 获取根 Fiber 节点 `hostRootFiber = root.current`。
 * 2. 请求当前操作的优先级车道 `lane = requestUpdateLane()`。
 * 3. 创建 Update 节点 `update = createUpdate(element, lane)`，其 action 即为目标 `element`。
 * 4. 调用 `enqueueUpdate(hostRootFiber.updateQueue, update)` 入队。
 * 5. 调用 `scheduleUpdateOnFiber(hostRootFiber, lane)` 启动调度。
 *
 * @param element 待渲染的 ReactElement（或 null）
 * @param root 应用的 FiberRootNode
 */
export declare function updateContainer(element: ReactElement | null, root: FiberRootNode): void;
//# sourceMappingURL=index.d.ts.map