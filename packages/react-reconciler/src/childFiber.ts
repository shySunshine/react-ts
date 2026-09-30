import { Key, Props, ReactElement, HostText } from '@react-ts/shared';
import { FiberNode, createWorkInProgress, createFiberFromElement } from './fiber';
import { REACT_ELEMENT_TYPE } from '@react-ts/shared';
import { Placement, ChildDeletion } from './fiberFlags';

/** 用于多节点 Diff 第二轮中快速查找可复用旧节点的哈希表映射类型 (key 或 index -> FiberNode) */
type ExistingChildren = Map<string | number, FiberNode>;

/**
 * 子节点协调器高阶工厂函数 (ChildReconciler)
 * 
 * @description
 * 通过闭包传入 `shouldTrackSideEffects`：
 * - `mountChildFibers` (false)：初次挂载时使用。不记录删除与插入副作用，优化内存与首次渲染速度。
 * - `reconcileChildFibers` (true)：更新阶段使用。严格追踪每个节点的变动并打上 Placement / ChildDeletion 副作用标记。
 * 
 * @param shouldTrackSideEffects 是否追踪并打上副作用标记 (Flags)
 */
function ChildReconciler(shouldTrackSideEffects: boolean) {
  /**
   * 将待删除的子节点记录到父节点的 deletions 列表中，并打上 ChildDeletion 标记
   */
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode): void {
    if (!shouldTrackSideEffects) return;
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }

  /**
   * 批量删除从 currentFirstChild 开始的所有兄弟旧节点
   */
  function deleteRemainingChildren(returnFiber: FiberNode, currentFirstChild: FiberNode | null): void {
    if (!shouldTrackSideEffects) return;
    let childToDelete = currentFirstChild;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
  }

  /**
   * 复用已有 Fiber 节点，创建对应的 WIP 镜像
   */
  function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  /**
   * 为单独的新建子节点打上 Placement 标记
   */
  function placeSingleChild(fiber: FiberNode): FiberNode {
    if (shouldTrackSideEffects && fiber.alternate === null) {
      fiber.flags |= Placement;
    }
    return fiber;
  }

  /**
   * 单个 ReactElement 节点的 Diff 协调
   * 
   * @description
   * 遍历旧子节点链表：
   * 1. 匹配 `key`：
   *    - 若 key 相同：
   *      - 若 `elementType === element.type`：**完全命中复用**！删除该节点之后的所有兄弟旧节点，调用 `useFiber` 复用当前节点并返回。
   *      - 若 type 不同：key 相同但类型改变，无法复用任何旧节点，删除当前及后续所有旧节点，跳出循环。
   *    - 若 key 不同：说明当前旧节点无法匹配，调用 `deleteChild` 删除当前单个旧节点，继续向后遍历匹配兄弟节点。
   * 2. 若全部旧节点无法复用：调用 `createFiberFromElement` 新建 FiberNode 并标记 Placement。
   * 
   * @param returnFiber 父 Fiber 节点
   * @param currentFirstChild 旧的第一个子 Fiber
   * @param element 新传入的单个 ReactElement
   * @returns 协调后的子 FiberNode
   */
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    element: ReactElement
  ): FiberNode {
    const key = element.key;
    let child = currentFirstChild;

    while (child !== null) {
      if (child.key === key) {
        if (child.elementType === element.type) {
          // Key 和 Type 均相同，复用当前 Fiber，删除其余兄弟节点
          deleteRemainingChildren(returnFiber, child.sibling);
          const existing = useFiber(child, element.props);
          existing.return = returnFiber;
          return existing;
        }
        // Key 相同但 Type 不同，无法复用，删除全部旧节点
        deleteRemainingChildren(returnFiber, child);
        break;
      } else {
        // Key 不同，删除单个不匹配的旧子节点，继续向后比对
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }

    // 无法复用，创建全新 FiberNode
    const created = createFiberFromElement(element);
    created.return = returnFiber;
    return placeSingleChild(created);
  }

  /**
   * 单个纯文本节点的 Diff 协调
   */
  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    content: string | number
  ): FiberNode {
    if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
      // 复用已有文本节点
      deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
      const existing = useFiber(currentFirstChild, { content });
      existing.return = returnFiber;
      return existing;
    }

    deleteRemainingChildren(returnFiber, currentFirstChild);
    const created = new FiberNode(HostText, { content }, null);
    created.return = returnFiber;
    return placeSingleChild(created);
  }

  /**
   * 数组多子节点的核心 Diff 算法 (Array Reconciliation)
   * 
   * @description
   * 1:1 遵循 React 核心 Diff 思想，分为两轮遍历：
   * 
   * **第一轮遍历**：
   * - 从头同时遍历新旧子节点（`newIdx` 与 `oldFiber`）。
   * - 若新旧节点的 key 和 type 相同，则原地复用；若 key 不匹配则立即中断第一轮遍历！
   * 
   * **边界情况快速退出**：
   * - 若新节点遍历完毕：将剩余旧节点全部删除。
   * - 若旧节点遍历完毕：将剩余新节点全部新建并打上 Placement。
   * 
   * **第二轮遍历（移动与乱序匹配）**：
   * - 将剩余的所有旧节点放入 Map 中（以 key 或 index 为索引）。
   * - 遍历剩余新节点，通过 key 在 Map 中查找是否有可复用的旧节点。
   * - **移动判断（lastPlacedIndex 机制）**：
   *   记录已复用节点在旧列表中的最大索引 `lastPlacedIndex`。
   *   若当前复用节点在旧列表中的索引 `oldIndex < lastPlacedIndex`，说明该节点相对原本位置向右移动了，打上 `Placement` 标记！
   *   反之更新 `lastPlacedIndex = oldIndex`。
   * - 遍历结束后，Map 中剩余未被消费的旧节点全部打上删除。
   * 
   * @param returnFiber 父 Fiber 节点
   * @param currentFirstChild 旧的第一个子 Fiber
   * @param newChildren 新虚拟 DOM 节点数组
   * @returns 协调后的第一个子 Fiber 节点
   */
  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChildren: any[]
  ): FiberNode | null {
    let resultingFirstChild: FiberNode | null = null;
    let previousNewFiber: FiberNode | null = null;
    let oldFiber = currentFirstChild;
    let lastPlacedIndex = 0;
    let newIdx = 0;
    let nextOldFiber: FiberNode | null = null;

    // 1. 第一轮遍历：从头按位置顺序比对，复用未移动的节点
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        oldFiber = null;
      } else {
        nextOldFiber = oldFiber.sibling;
      }

      const newChild = newChildren[newIdx];
      const matchedFiber = updateSlot(returnFiber, oldFiber, newChild);
      if (matchedFiber === null) {
        if (oldFiber === null) {
          oldFiber = nextOldFiber;
        }
        break;
      }

      if (shouldTrackSideEffects) {
        if (oldFiber && matchedFiber.alternate === null) {
          deleteChild(returnFiber, oldFiber);
        }
      }

      lastPlacedIndex = placeChild(matchedFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = matchedFiber;
      } else {
        previousNewFiber.sibling = matchedFiber;
      }
      previousNewFiber = matchedFiber;
      oldFiber = nextOldFiber;
    }

    // 新节点全部处理完毕，删除剩余旧节点
    if (newIdx === newChildren.length) {
      deleteRemainingChildren(returnFiber, oldFiber);
      return resultingFirstChild;
    }

    // 旧节点已用尽，剩下的全是新节点，直接插入
    if (oldFiber === null) {
      for (; newIdx < newChildren.length; newIdx++) {
        const newChild = newChildren[newIdx];
        const newFiber = createChild(returnFiber, newChild);
        if (newFiber === null) continue;

        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
      return resultingFirstChild;
    }

    // 2. 第二轮：将剩余旧节点放入 Map，通过 key / index 进行 O(1) 查找复用
    const existingChildren: ExistingChildren = new Map();
    let currentChild: FiberNode | null = oldFiber;
    while (currentChild !== null) {
      const id = currentChild.key != null ? currentChild.key : currentChild.index;
      existingChildren.set(id, currentChild);
      currentChild = currentChild.sibling;
    }

    // 遍历剩余新节点，在 Map 中复用或新建
    for (; newIdx < newChildren.length; newIdx++) {
      const newChild = newChildren[newIdx];
      const newFiber = updateFromMap(existingChildren, returnFiber, newIdx, newChild);
      if (newFiber !== null) {
        if (shouldTrackSideEffects && newFiber.alternate !== null) {
          existingChildren.delete(newFiber.key != null ? newFiber.key : newIdx);
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    // 删除 Map 中未被复用的残留旧节点
    if (shouldTrackSideEffects) {
      existingChildren.forEach((child) => deleteChild(returnFiber, child));
    }

    return resultingFirstChild;
  }

  /**
   * 标记子节点的位置与是否需要移动 (placeChild)
   * 
   * @param newFiber 当前处理的新子 Fiber
   * @param lastPlacedIndex 当前已复用节点在旧列表中的最右索引
   * @param newIndex 新节点在当前同级列表中的索引
   * @returns 更新后的 lastPlacedIndex
   */
  function placeChild(newFiber: FiberNode, lastPlacedIndex: number, newIndex: number): number {
    newFiber.index = newIndex;
    if (!shouldTrackSideEffects) return lastPlacedIndex;

    const current = newFiber.alternate;
    if (current !== null) {
      const oldIndex = current.index;
      if (oldIndex < lastPlacedIndex) {
        // 原位置在当前参照点左侧，说明该节点向右移动了，需要打上 Placement 移动标记
        newFiber.flags |= Placement;
        return lastPlacedIndex;
      } else {
        return oldIndex;
      }
    } else {
      // 纯新节点，标记 Placement 插入
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    }
  }

  /**
   * 对比单个槽位上的新旧节点是否能够复用
   */
  function updateSlot(returnFiber: FiberNode, oldFiber: FiberNode | null, newChild: any): FiberNode | null {
    if (typeof newChild === 'object' && newChild !== null && newChild.$$typeof === REACT_ELEMENT_TYPE) {
      if (oldFiber !== null && oldFiber.key === newChild.key) {
        if (oldFiber.elementType === newChild.type) {
          const existing = useFiber(oldFiber, newChild.props);
          existing.return = returnFiber;
          return existing;
        }
      }
      return null;
    }
    return null;
  }

  /**
   * 根据传入数据创建对应的新子 Fiber
   */
  function createChild(returnFiber: FiberNode, newChild: any): FiberNode | null {
    if ((typeof newChild === 'string' && newChild !== '') || typeof newChild === 'number') {
      const created = new FiberNode(HostText, { content: newChild }, null);
      created.return = returnFiber;
      return created;
    }
    if (typeof newChild === 'object' && newChild !== null && newChild.$$typeof === REACT_ELEMENT_TYPE) {
      const created = createFiberFromElement(newChild);
      created.return = returnFiber;
      return created;
    }
    return null;
  }

  /**
   * 从 Map 映射表中根据 key/index 查找并复用旧 Fiber，或新建 Fiber
   */
  function updateFromMap(
    existingChildren: ExistingChildren,
    returnFiber: FiberNode,
    newIdx: number,
    newChild: any
  ): FiberNode | null {
    if ((typeof newChild === 'string' && newChild !== '') || typeof newChild === 'number') {
      const existing = existingChildren.get(newIdx);
      if (existing && existing.tag === HostText) {
        existingChildren.delete(newIdx);
        const clone = useFiber(existing, { content: newChild });
        clone.return = returnFiber;
        return clone;
      }
      const created = new FiberNode(HostText, { content: newChild }, null);
      created.return = returnFiber;
      return created;
    }

    if (typeof newChild === 'object' && newChild !== null && newChild.$$typeof === REACT_ELEMENT_TYPE) {
      const id = newChild.key != null ? newChild.key : newIdx;
      const existing = existingChildren.get(id);

      if (existing) {
        if (existing.elementType === newChild.type) {
          existingChildren.delete(id);
          const clone = useFiber(existing, newChild.props);
          clone.return = returnFiber;
          return clone;
        }
      }

      const created = createFiberFromElement(newChild);
      created.return = returnFiber;
      return created;
    }

    return null;
  }

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild?: any
  ): FiberNode | null {
    // 忽略 null, undefined, boolean 等不可见子项
    if (newChild === null || newChild === undefined || typeof newChild === 'boolean') {
      deleteRemainingChildren(returnFiber, currentFirstChild);
      return null;
    }

    // 单个 ReactElement 节点
    if (typeof newChild === 'object' && newChild.$$typeof === REACT_ELEMENT_TYPE) {
      return reconcileSingleElement(returnFiber, currentFirstChild, newChild);
    }

    // 单个文本节点
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return reconcileSingleTextNode(returnFiber, currentFirstChild, newChild);
    }

    // 数组子节点 Diff
    if (Array.isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild);
    }

    deleteRemainingChildren(returnFiber, currentFirstChild);
    return null;
  };
}

/** 更新阶段的子节点协调器：追踪并标记副作用 Flags */
export const reconcileChildFibers = ChildReconciler(true);
/** 初次挂载阶段的子节点协调器：不打 Placement，由 HostRoot 统一挂载 */
export const mountChildFibers = ChildReconciler(false);

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
export function cloneChildFibers(current: FiberNode | null, wip: FiberNode): void {
  if (wip.child === null) {
    return;
  }

  let currentChild = wip.child;
  let newChild = createWorkInProgress(currentChild, currentChild.pendingProps);
  wip.child = newChild;
  newChild.return = wip;

  while (currentChild.sibling !== null) {
    currentChild = currentChild.sibling;
    newChild = newChild.sibling = createWorkInProgress(currentChild, currentChild.pendingProps);
    newChild.return = wip;
  }
  newChild.sibling = null;
}

