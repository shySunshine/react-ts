import { FiberNode } from './fiber';
/** 更新阶段的子节点协调器：追踪并标记副作用 Flags */
export declare const reconcileChildFibers: (returnFiber: FiberNode, currentFirstChild: FiberNode | null, newChild?: any) => FiberNode | null;
/** 初次挂载阶段的子节点协调器：不打 Placement，由 HostRoot 统一挂载 */
export declare const mountChildFibers: (returnFiber: FiberNode, currentFirstChild: FiberNode | null, newChild?: any) => FiberNode | null;
/**
 * Bailout 阶段复用与克隆已有子 Fiber 节点链表
 *
 * @description
 * 当某个父节点满足 Bailout 条件但其子树仍有待处理任务时，
 * 此函数快速沿 `sibling` 链表克隆当前层级的所有子 FiberNode，恢复 WIP 树结构。
 *
 * @param current 旧父 Fiber 节点
 * @param wip 当前 WIP 父 Fiber 节点
 */
export declare function cloneChildFibers(current: FiberNode | null, wip: FiberNode): void;
//# sourceMappingURL=childFiber.d.ts.map