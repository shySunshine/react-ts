import { HostComponent, HostText, HostRoot, FunctionComponent, ForwardRef, HostPortal } from '@react-ts/shared';
import { MutationMask, PassiveMask, Placement, Update, Passive, Ref, Layout } from './fiberFlags';
import { hostConfig } from './hostConfig';
import { unstable_scheduleCallback, NormalPriority } from '@react-ts/scheduler';
/** 遍历副作用链表时的当前指针 */
let nextEffect = null;
/**
 * 提交阶段总入口 (commitRoot)
 *
 * @description
 * 在 Render 阶段完成整棵 WIP Fiber 树的协调后被同步调用。
 * Commit 阶段是**同步且不可中断**的，主要按次序执行三个关键子阶段：
 * 1. **调度 Passive 阶段 (useEffect)**：若树上存在 `PassiveMask`，向 Scheduler 注册异步非阻塞宏任务。
 * 2. **Mutation 阶段**：深度优先遍历树，同步执行真实 DOM 突变（`ChildDeletion` 卸载、`Placement` 挂载/移动、`Update` 属性文本变更、解绑旧 `Ref`）。
 * 3. **双缓存指针切换**：`root.current = finishedWork`，将已完成的树切换为屏幕生效树！
 * 4. **Layout 阶段**：在浏览器重绘（paint）前同步执行 `useLayoutEffect` 的销毁与创建回调，并绑定新 `Ref`。
 *
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/workLoop.ts` 中的 `performConcurrentWorkOnRoot`（Render 阶段全部完成后）。
 *
 * @param root 应用的 FiberRootNode
 */
export function commitRoot(root) {
    const finishedWork = root.finishedWork;
    if (finishedWork === null)
        return;
    root.finishedWork = null;
    root.finishedLane = 0;
    // 1. 检查是否存在 useEffect 被动副作用
    if ((finishedWork.flags & PassiveMask) !== 0 || (finishedWork.subtreeFlags & PassiveMask) !== 0) {
        schedulePassiveEffects(finishedWork);
    }
    // 2. 检查是否存在 Mutation 阶段 DOM 变更 (Placement, Update, Deletion, Ref)
    const subtreeHasEffects = (finishedWork.subtreeFlags & MutationMask) !== 0;
    const rootHasEffect = (finishedWork.flags & MutationMask) !== 0;
    if (subtreeHasEffects || rootHasEffect) {
        commitMutationEffects(root, finishedWork);
    }
    // 双缓存切换：将 current 指针指向新渲染完的 workInProgress 树
    root.current = finishedWork;
    // 3. 同步执行 Layout 阶段副作用 (useLayoutEffect 与 Ref 挂载)
    commitLayoutEffects(finishedWork);
}
/**
 * 调度 useEffect 被动副作用
 *
 * @description
 * 在 Scheduler 中以 NormalPriority 注册宏任务，确保在浏览器完成绘制（Paint）后再异步触发，避免阻塞首屏展示。
 */
function schedulePassiveEffects(finishedWork) {
    unstable_scheduleCallback(NormalPriority, () => {
        flushPassiveEffects(finishedWork);
    });
}
/**
 * 刷新并执行所有 useEffect 回调
 *
 * @description
 * 1. 先自底向上触发所有旧的 `destroy` 销毁回调。
 * 2. 再自顶向下触发所有新的 `create` 执行回调。
 */
function flushPassiveEffects(rootFiber) {
    // 1. 递归触发所有待销毁的 destroy 回调
    commitPassiveUnmountEffects(rootFiber);
    // 2. 递归触发所有新创建的 create 回调
    commitPassiveMountEffects(rootFiber);
}
/**
 * 递归触发组件的 useEffect destroy 销毁回调
 */
function commitPassiveUnmountEffects(fiber) {
    if (fiber.tag === FunctionComponent) {
        const updateQueue = fiber.updateQueue;
        if (updateQueue !== null && updateQueue.lastEffect !== null) {
            const lastEffect = updateQueue.lastEffect;
            let effect = lastEffect.next;
            do {
                if ((effect.tag & Passive) !== 0 && typeof effect.destroy === 'function') {
                    effect.destroy();
                }
                effect = effect.next;
            } while (effect !== lastEffect.next);
        }
    }
    let child = fiber.child;
    while (child !== null) {
        commitPassiveUnmountEffects(child);
        child = child.sibling;
    }
}
/**
 * 递归触发组件的 useEffect create 挂载回调
 */
function commitPassiveMountEffects(fiber) {
    if (fiber.tag === FunctionComponent) {
        const updateQueue = fiber.updateQueue;
        if (updateQueue !== null && updateQueue.lastEffect !== null) {
            const lastEffect = updateQueue.lastEffect;
            let effect = lastEffect.next;
            do {
                if ((effect.tag & Passive) !== 0 && typeof effect.create === 'function') {
                    const destroy = effect.create();
                    effect.destroy = typeof destroy === 'function' ? destroy : undefined;
                }
                effect = effect.next;
            } while (effect !== lastEffect.next);
        }
    }
    let child = fiber.child;
    while (child !== null) {
        commitPassiveMountEffects(child);
        child = child.sibling;
    }
}
/**
 * 深度优先遍历执行 DOM Mutation 变动
 *
 * @description
 * 利用 `subtreeFlags & MutationMask` 快速向下钻取到包含副作用的最深子节点，
 * 随后自底向上逐层调用 `commitMutationEffectsOnFiber` 应用真实 DOM 变更。
 */
function commitMutationEffects(root, finishedWork) {
    nextEffect = finishedWork;
    while (nextEffect !== null) {
        const child = nextEffect.child;
        if ((nextEffect.subtreeFlags & MutationMask) !== 0 && child !== null) {
            nextEffect = child;
        }
        else {
            while (nextEffect !== null) {
                commitMutationEffectsOnFiber(nextEffect, root);
                const sibling = nextEffect.sibling;
                if (sibling !== null) {
                    nextEffect = sibling;
                    break;
                }
                nextEffect = nextEffect.return;
            }
        }
    }
}
/**
 * 在单个 Fiber 节点上执行具体的 DOM 突变
 *
 * @description
 * 按顺序处理：
 * 0. Ref 改变时，先卸载旧 Ref。
 * 1. 存在 deletions 时，从真实 DOM 中递归删除子树并解绑 Ref。
 * 2. Placement：将真实 DOM 插入或移动到容器的正确位置。
 * 3. Update：更新真实 DOM 的属性或文本内容。
 */
function commitMutationEffectsOnFiber(finishedWork, root) {
    const flags = finishedWork.flags;
    // 0. 如果 Ref 改变，卸载旧 Ref
    if ((flags & Ref) !== 0 && finishedWork.alternate !== null) {
        commitDetachRef(finishedWork.alternate);
    }
    // 1. 删除子节点
    if (finishedWork.deletions !== null) {
        finishedWork.deletions.forEach((childToDelete) => {
            commitDeletion(childToDelete, root);
        });
        finishedWork.deletions = null;
    }
    // 2. 插入节点 Placement
    if ((flags & Placement) !== 0) {
        commitPlacement(finishedWork);
        finishedWork.flags &= ~Placement;
    }
    // 3. 属性更新 Update
    if ((flags & Update) !== 0) {
        commitWork(finishedWork);
        finishedWork.flags &= ~Update;
    }
}
/**
 * 同步执行 Layout 阶段副作用
 */
function commitLayoutEffects(finishedWork) {
    commitLayoutEffectsOnFiber(finishedWork);
}
/**
 * 在单个 Fiber 节点上同步执行 Layout 回调与 Ref 挂载
 */
function commitLayoutEffectsOnFiber(fiber) {
    if ((fiber.flags & Layout) !== 0) {
        commitHookLayoutEffects(fiber);
        fiber.flags &= ~Layout;
    }
    if ((fiber.flags & Ref) !== 0) {
        commitAttachRef(fiber);
        fiber.flags &= ~Ref;
    }
    let child = fiber.child;
    while (child !== null) {
        commitLayoutEffectsOnFiber(child);
        child = child.sibling;
    }
}
/**
 * 同步触发 useLayoutEffect 的销毁与重新创建
 */
function commitHookLayoutEffects(fiber) {
    if (fiber.tag === FunctionComponent || fiber.tag === ForwardRef) {
        const updateQueue = fiber.updateQueue;
        if (updateQueue !== null && updateQueue.lastEffect !== null) {
            const lastEffect = updateQueue.lastEffect;
            let effect = lastEffect.next;
            do {
                if ((effect.tag & Layout) !== 0) {
                    if (typeof effect.destroy === 'function') {
                        effect.destroy();
                    }
                    const destroy = effect.create();
                    effect.destroy = typeof destroy === 'function' ? destroy : undefined;
                }
                effect = effect.next;
            } while (effect !== lastEffect.next);
        }
    }
}
/**
 * 挂载并绑定新 Ref
 */
function commitAttachRef(finishedWork) {
    const ref = finishedWork.ref;
    if (ref !== null) {
        const instance = finishedWork.stateNode;
        if (typeof ref === 'function') {
            ref(instance);
        }
        else if (typeof ref === 'object' && ref !== null) {
            ref.current = instance;
        }
    }
}
/**
 * 解除并清空旧 Ref
 */
function commitDetachRef(current) {
    const currentRef = current.ref;
    if (currentRef !== null) {
        if (typeof currentRef === 'function') {
            currentRef(null);
        }
        else if (typeof currentRef === 'object' && currentRef !== null) {
            currentRef.current = null;
        }
    }
}
/**
 * 执行 Placement 挂载/移动操作
 *
 * @description
 * 向上查找最近的宿主 DOM 父节点 `hostParent`，以及向右查找目标插入位置的参考兄弟 DOM 节点 `before`，
 * 调用 `insertOrAppendPlacementNodeIntoContainer` 完成物理插入。
 */
function commitPlacement(finishedWork) {
    if (finishedWork.tag === HostRoot)
        return;
    const hostParent = getHostParent(finishedWork);
    const before = getHostSibling(finishedWork);
    if (hostParent !== null) {
        insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, before);
    }
}
/**
 * 执行 Update DOM 属性与文本更新
 */
function commitWork(finishedWork) {
    if (finishedWork.tag === HostComponent) {
        hostConfig.commitUpdate(finishedWork);
    }
    else if (finishedWork.tag === HostText) {
        hostConfig.commitTextUpdate(finishedWork.stateNode, finishedWork.pendingProps.content);
    }
}
/**
 * 执行 ChildDeletion 节点删除
 *
 * @description
 * 深度遍历待删除的整棵子树：
 * 1. 解绑所有沿途组件的 Ref。
 * 2. 找到第一个宿主 DOM 根节点，从其宿主父节点中调用 `hostConfig.removeChild` 移除。
 * 3. 断开 Fiber 的拓扑链接帮助垃圾回收。
 */
function commitDeletion(childToDelete, root) {
    let hostSubtreeRoot = null;
    commitNestedUnmounts(childToDelete, (unmountFiber) => {
        commitDetachRef(unmountFiber);
        if (unmountFiber.tag === HostComponent || unmountFiber.tag === HostText) {
            if (hostSubtreeRoot === null) {
                hostSubtreeRoot = unmountFiber;
            }
        }
    });
    if (hostSubtreeRoot !== null) {
        const hostParent = getHostParent(childToDelete);
        if (hostParent !== null) {
            hostConfig.removeChild(hostParent, hostSubtreeRoot.stateNode);
        }
    }
    childToDelete.return = null;
    childToDelete.child = null;
}
/**
 * 递归遍历待删除子树的所有后代 Fiber
 */
function commitNestedUnmounts(root, onCommitUnmount) {
    let node = root;
    while (true) {
        onCommitUnmount(node);
        if (node.child !== null) {
            node.child.return = node;
            node = node.child;
            continue;
        }
        if (node === root)
            return;
        while (node.sibling === null) {
            if (node.return === null || node.return === root)
                return;
            node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
    }
}
/**
 * 向上查找最近的物理宿主 DOM 父节点
 */
function getHostParent(fiber) {
    let parent = fiber.return;
    while (parent !== null) {
        if (parent.tag === HostComponent) {
            return parent.stateNode;
        }
        if (parent.tag === HostRoot) {
            return parent.stateNode.container;
        }
        if (parent.tag === HostPortal) {
            return parent.stateNode.containerInfo;
        }
        parent = parent.return;
    }
    return null;
}
/**
 * 向右查找同级物理宿主 DOM 兄弟节点 (用于 insertBefore)
 *
 * @description
 * 跨越抽象组件层级，精准定位下一个稳定未移动的真实 DOM 实例。
 */
function getHostSibling(fiber) {
    let node = fiber;
    findSibling: while (true) {
        while (node.sibling === null) {
            if (node.return === null || node.return.tag === HostComponent || node.return.tag === HostRoot) {
                return null;
            }
            node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
        while (node.tag !== HostComponent && node.tag !== HostText) {
            if ((node.flags & Placement) !== 0) {
                continue findSibling;
            }
            if (node.child === null) {
                continue findSibling;
            }
            else {
                node.child.return = node;
                node = node.child;
            }
        }
        if ((node.flags & Placement) === 0) {
            return node.stateNode;
        }
    }
}
/**
 * 将 Fiber 对应的物理 DOM 节点插入或追加到宿主容器中
 */
function insertOrAppendPlacementNodeIntoContainer(node, parent, before) {
    if (node.tag === HostComponent || node.tag === HostText) {
        if (before) {
            hostConfig.insertChildToContainer(parent, node.stateNode, before);
        }
        else {
            hostConfig.appendChildToContainer(parent, node.stateNode);
        }
        return;
    }
    const child = node.child;
    if (child !== null) {
        insertOrAppendPlacementNodeIntoContainer(child, parent, before);
        let sibling = child.sibling;
        while (sibling !== null) {
            insertOrAppendPlacementNodeIntoContainer(sibling, parent, before);
            sibling = sibling.sibling;
        }
    }
}
//# sourceMappingURL=commitWork.js.map