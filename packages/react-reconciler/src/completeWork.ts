import {
  HostComponent,
  HostText,
  HostRoot,
  FunctionComponent,
  Fragment,
  ContextProvider,
  ForwardRef,
  HostPortal,
  MemoComponent
} from '@react-ts/shared';
import { FiberNode } from './fiber';
import { hostConfig } from './hostConfig';
import { NoFlags, Update } from './fiberFlags';
import { NoLanes, mergeLanes } from './fiberLane';
import { popProvider } from './fiberContext';

/**
 * 协调“归”阶段主入口 (completeWork)
 * 
 * @description
 * 当一个 Fiber 节点的子树全部遍历完毕，回溯进入 `completeWork`：
 * 1. **HostComponent（DOM 元素）**：
 *    - 初次挂载：调用 `hostConfig.createInstance` 创建真实 DOM 元素，并调用 `appendAllChildren` 将其直接子孙的 DOM 节点拼接在内存中，构建出完整的离屏 DOM 子树！
 *    - 更新阶段：对比新旧 props（`checkPropsChanged`），若发生变化打上 `Update` 副作用标记。
 * 2. **HostText（文本节点）**：创建真实 Text 实例或对比文本内容打上 `Update`。
 * 3. **ContextProvider**：调用 `popProvider` 将当前 Context 弹出上下文栈，恢复父级上下文。
 * 4. **副作用冒泡 (bubbleProperties)**：收集整棵子树的 `flags` 到 `subtreeFlags`，以及 `lanes` 到 `childLanes`。
 * 
 * @callsite 主要调用位置：
 * - `packages/react-reconciler/src/workLoop.ts` 中的 `completeUnitOfWork`。
 * 
 * @param current 旧 Fiber 节点
 * @param wip 正在完成的 WIP Fiber 节点
 * @returns 始终返回 null（由 completeUnitOfWork 负责寻找兄弟或父节点）
 */
export function completeWork(current: FiberNode | null, wip: FiberNode): FiberNode | null {
  const newProps = wip.pendingProps;

  switch (wip.tag) {
    case HostComponent: {
      if (current !== null && wip.stateNode !== null) {
        // 更新阶段：检查属性是否变更
        if (checkPropsChanged(current.memoizedProps, newProps)) {
          wip.flags |= Update;
        }
      } else {
        // 挂载阶段：创建真实 DOM 实例并拼接离屏子树
        const instance = hostConfig.createInstance(wip.type, newProps);
        appendAllChildren(instance, wip);
        wip.stateNode = instance;
      }
      bubbleProperties(wip);
      return null;
    }

    case HostText: {
      if (current !== null && wip.stateNode !== null) {
        const oldText = current.memoizedProps?.content;
        const newText = newProps.content;
        if (oldText !== newText) {
          wip.flags |= Update;
        }
      } else {
        const textInstance = hostConfig.createTextInstance(newProps.content);
        wip.stateNode = textInstance;
      }
      bubbleProperties(wip);
      return null;
    }

    case ContextProvider: {
      const context = wip.type._context;
      popProvider(context);
      bubbleProperties(wip);
      return null;
    }

    case HostRoot:
    case FunctionComponent:
    case Fragment:
    case ForwardRef:
    case HostPortal:
    case MemoComponent:
      bubbleProperties(wip);
      return null;

    default:
      bubbleProperties(wip);
      return null;
  }
}

/**
 * 递归将 WIP 节点下所有第一层物理宿主 DOM 节点挂载到 parent DOM 上
 * 
 * @description
 * 在初次挂载阶段，自底向上构建 DOM 树。
 * 因为中间可能嵌套着没有真实 DOM 实体的抽象组件（如 `<App>`, `<Fragment>`, `<Context.Provider>`），
 * 该算法会向下深入查找真实的 `HostComponent` 和 `HostText`，并将其直接 append 到父级 DOM 上。
 * 这样在最终 Commit 阶段，只需一次 DOM 插入就能将整棵离屏树挂载到页面上，极大提升首屏性能！
 * 
 * @param parent 真实的父 DOM 节点
 * @param wip 当前容器 Fiber 节点
 */
function appendAllChildren(parent: any, wip: FiberNode) {
  let node = wip.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      hostConfig.appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === wip) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === wip) {
        return;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

/**
 * 向上冒泡副作用标记与车道信息 (bubbleProperties)
 * 
 * @description
 * 将所有子节点的 `flags`（自身副作用）与 `subtreeFlags`（后代副作用）按位或聚合到父节点的 `subtreeFlags`。
 * 将所有子节点的 `lanes` 与 `childLanes` 按位或聚合到父节点的 `childLanes`。
 * 这样在 Commit 阶段，只需检查根节点的 `subtreeFlags !== NoFlags` 就能在 $O(1)$ 判定整棵树是否有工作需要提交。
 * 
 * @param wip 目标 Fiber 节点
 */
function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags;
  let childLanes = NoLanes;
  let child = wip.child;

  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;

    childLanes = mergeLanes(childLanes, child.lanes);
    childLanes = mergeLanes(childLanes, child.childLanes);

    child.return = wip;
    child = child.sibling;
  }

  wip.subtreeFlags |= subtreeFlags;
  wip.childLanes = childLanes;
}

/**
 * 浅比较两个 Props 对象是否发生实质变化
 * 
 * @description
 * 忽略 `children`（由 Diff 算法专门比对），对比其余键值是否全等。
 * 
 * @param oldProps 旧属性对象
 * @param newProps 新属性对象
 * @returns `true` 表示发生改变；`false` 表示完全相同
 */
export function checkPropsChanged(oldProps: any, newProps: any): boolean {
  if (oldProps === newProps) return false;
  if (!oldProps || !newProps) return true;

  for (const key in newProps) {
    if (key === 'children') continue;
    if (newProps[key] !== oldProps[key]) return true;
  }

  for (const key in oldProps) {
    if (key === 'children') continue;
    if (!(key in newProps)) return true;
  }

  return false;
}

