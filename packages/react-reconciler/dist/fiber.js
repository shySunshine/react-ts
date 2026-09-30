import { FunctionComponent, HostComponent, Fragment, MemoComponent, ContextProvider, ForwardRef, HostPortal, REACT_MEMO_TYPE, REACT_PROVIDER_TYPE, REACT_FORWARD_REF_TYPE, REACT_PORTAL_TYPE } from '@react-ts/shared';
import { NoFlags } from './fiberFlags';
import { NoLane, NoLanes } from './fiberLane';
import { NoPriority } from '@react-ts/scheduler';
/**
 * React 核心协调单元：FiberNode (纤程节点)
 *
 * @description
 * Fiber 是虚拟 DOM 的底层进化形式。每个 React 元素都会转化为一个 FiberNode。
 * 它既是一个执行工作单元（Unit of Work），也是一棵可以通过 child/sibling/return 进行随时中断与恢复遍历的单向链表树。
 */
export class FiberNode {
    /** 节点类型标识 (WorkTag)，如 FunctionComponent、HostComponent 等 */
    tag;
    /** 用于 Diff 算法复用节点的唯一标识 */
    key;
    /** ReactElement 的原始 type（如 App 组件函数或 'div'） */
    elementType;
    /** 经过解析后的具体函数、类或标签名 */
    type;
    /** 对应的宿主环境真实实例（对于 HostComponent 为真实 DOM 元素；对于 HostRoot 为 FiberRootNode） */
    stateNode;
    // ===== 树拓扑结构指针 (链表二叉树) =====
    /** 指向父级 Fiber 节点 */
    return = null;
    /** 指向第一个子级 Fiber 节点 */
    child = null;
    /** 指向右侧第一个兄弟 Fiber 节点 */
    sibling = null;
    /** 当前节点在同级兄弟节点中的索引位置 */
    index = 0;
    /** 挂载在该节点上的 ref 引用 */
    ref = null;
    // ===== Props 与 State 数据状态 =====
    /** 本次渲染正在处理的新 props */
    pendingProps;
    /** 上一次渲染完成时生效的旧 props */
    memoizedProps = null;
    /**
     * 当前组件的记忆化状态：
     * - 函数组件：指向 Hooks 单向链表的第一个 Hook 节点；
     * - HostRoot：指向当前树挂载的 ReactElement 根元素；
     * - 类组件：指向 class 实例的 state。
     */
    memoizedState = null;
    /** 状态更新队列（包含待消费的 Update 环形链表） */
    updateQueue = null;
    // ===== 副作用标记 =====
    /** 当前节点自身的副作用标记（二进制位掩码） */
    flags = NoFlags;
    /** 子树中所有子节点副作用标记的按位或聚合，用于快速判断子树是否有工作需要提交（冒泡优化） */
    subtreeFlags = NoFlags;
    /** 需要被删除的子 Fiber 节点列表（在父 Fiber 上记录） */
    deletions = null;
    // ===== Lane 车道优先级 =====
    /** 当前 Fiber 节点自身待处理的更新车道集合 */
    lanes = NoLanes;
    /** 当前 Fiber 的所有子树节点待处理的更新车道集合（用于 Bailout 剪枝跳过整棵子树） */
    childLanes = NoLanes;
    // ===== 双缓存机制 (Double Buffering) =====
    /** 指向双缓存镜像节点（Current 节点的 alternate 指向 WorkInProgress；WorkInProgress 的 alternate 指向 Current） */
    alternate = null;
    constructor(tag, pendingProps, key) {
        this.tag = tag;
        this.key = key;
        this.stateNode = null;
        this.type = null;
        this.pendingProps = pendingProps;
    }
}
/**
 * 应用根容器节点 (FiberRootNode)
 *
 * @description
 * 整个 React 应用的顶级统筹节点。
 * 持有应用挂载的真实 DOM 容器、当前屏幕生效的 Fiber 树（current）、
 * 正在构建完成的 Fiber 树（finishedWork）以及 Scheduler 任务回调引用。
 */
export class FiberRootNode {
    /** 挂载的真实 DOM 容器（如 div#root） */
    container;
    /** 指向当前屏幕上正在显示的 Fiber 树的 HostRootFiber */
    current;
    /** 指向已经协调完毕、等待 Commit 阶段提交到真实 DOM 的 WIP HostRootFiber */
    finishedWork = null;
    /** 当前应用中所有未完成更新的 Lane 集合 */
    pendingLanes = NoLanes;
    /** 本次渲染批次刚刚完成处理的 Lane */
    finishedLane = NoLane;
    /** Scheduler 调度器返回的当前任务 Task 引用（用于取消旧调度） */
    callbackNode = null;
    /** 当前调度任务所对应的优先级 */
    callbackPriority = NoPriority;
    constructor(container, hostRootFiber) {
        this.container = container;
        this.current = hostRootFiber;
        hostRootFiber.stateNode = this;
    }
}
/**
 * 双缓存机制核心：创建或复用 WorkInProgress (WIP) Fiber 节点
 *
 * @description
 * React 采用双缓存机制：屏幕上显示的树为 `current` 树，在内存中异步构建的树为 `workInProgress` (wip) 树。
 * 两棵树的节点通过 `alternate` 相互指向，交替复用内存中的对象，彻底避免频繁垃圾回收与内存抖动。
 *
 * @callsite 主要调用位置：
 * - `workLoop.ts`：从根节点开始准备 WIP 树时调用。
 * - `beginWork.ts`：进入每一个子节点协调前，调用此函数获取 WIP 子节点。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 检查 `current.alternate`：
 *    - 若为 `null`（初次挂载 Mount 阶段）：新建一个 `FiberNode` 实例，与 `current` 互设 `alternate`。
 *    - 若已存在（更新 Update 阶段）：直接复用已有实例，重置 `flags`、`subtreeFlags` 和 `deletions`。
 * 2. 同步继承 `current` 的 props、state、child、updateQueue 和 lanes 等必要字段。
 *
 * @param current 当前屏幕上正在显示的 FiberNode
 * @param pendingProps 即将应用的新属性
 * @returns 构建中的 WorkInProgress FiberNode
 */
export function createWorkInProgress(current, pendingProps) {
    let wip = current.alternate;
    if (wip === null) {
        // 首屏渲染 mount 阶段，创建新的 FiberNode 实例
        wip = new FiberNode(current.tag, pendingProps, current.key);
        wip.stateNode = current.stateNode;
        wip.elementType = current.elementType;
        wip.type = current.type;
        wip.alternate = current;
        current.alternate = wip;
    }
    else {
        // update 阶段，复用已有的 alternate 节点，重置状态与副作用 flags
        wip.pendingProps = pendingProps;
        wip.flags = NoFlags;
        wip.subtreeFlags = NoFlags;
        wip.deletions = null;
    }
    wip.type = current.type;
    wip.updateQueue = current.updateQueue;
    wip.child = current.child;
    wip.memoizedProps = current.memoizedProps;
    wip.memoizedState = current.memoizedState;
    wip.ref = current.ref;
    wip.lanes = current.lanes;
    wip.childLanes = current.childLanes;
    return wip;
}
/**
 * 根据 ReactElement 蓝图创建对应的 FiberNode 实例
 *
 * @description
 * 解析虚拟 DOM 元素的类型与 Symbol 标记，映射分配正确的 `WorkTag`，并初始化挂载所需的属性。
 *
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/childFiber.ts`：在 Diff 过程中根据新生成的 ReactElement 创建新 Fiber。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 识别 `element.$$typeof`：若是 `REACT_PORTAL_TYPE`，打上 `HostPortal`。
 * 2. 识别 `element.type`：
 *    - 字符串（'div'）-> `HostComponent`。
 *    - 对象：根据 `$$typeof` 识别 `MemoComponent`、`ContextProvider`、`ForwardRef`。
 *    - 函数 -> `FunctionComponent`。
 *    - 其他 -> `Fragment`。
 * 3. 实例化 `new FiberNode(fiberTag, props, key)`，并挂载 `ref` 和 `containerInfo`。
 *
 * @param element 传入的 ReactElement 虚拟 DOM 对象
 * @returns 对应类型的初始 FiberNode
 */
export function createFiberFromElement(element) {
    const { type, key, props, ref } = element;
    let fiberTag = FunctionComponent;
    if (element.$$typeof === REACT_PORTAL_TYPE) {
        fiberTag = HostPortal;
    }
    else if (typeof type === 'string') {
        // 原生 DOM 标签 (div, p, span 等)
        fiberTag = HostComponent;
    }
    else if (typeof type === 'object' && type !== null) {
        if (type.$$typeof === REACT_MEMO_TYPE) {
            fiberTag = MemoComponent;
        }
        else if (type.$$typeof === REACT_PROVIDER_TYPE) {
            fiberTag = ContextProvider;
        }
        else if (type.$$typeof === REACT_FORWARD_REF_TYPE) {
            fiberTag = ForwardRef;
        }
    }
    else if (typeof type !== 'function') {
        // Fragment 或其他特殊类型
        fiberTag = Fragment;
    }
    const fiber = new FiberNode(fiberTag, props, key);
    fiber.type = type;
    fiber.elementType = type;
    fiber.ref = ref;
    if (fiberTag === HostPortal) {
        fiber.stateNode = {
            containerInfo: element.containerInfo || props.containerInfo
        };
    }
    return fiber;
}
//# sourceMappingURL=fiber.js.map