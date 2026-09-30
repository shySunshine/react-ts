/**
 * 高性能小顶堆 (Min-Heap) 实现
 *
 * 作用：
 * 在 React Scheduler 调度器中，用于对异步任务进行优先级排序。
 * 堆顶始终保持为优先级最高（即 sortIndex/expirationTime 最小、最先需要被执行）的任务。
 */
/**
 * 堆节点接口
 * 必须包含用于排序的唯一标识 id 和排序依据 sortIndex（如任务的 expirationTime）
 */
export interface HeapNode {
    id: number;
    sortIndex: number;
}
/**
 * 堆类型定义，使用连续数组存储完全二叉树
 */
export type Heap<T extends HeapNode> = T[];
/**
 * 向小顶堆中插入新节点
 *
 * @description
 * 将新任务节点插入小顶堆，并自动向上调整以重新维持小顶堆的有序性。
 *
 * @callsite 主要调用位置：
 * - `packages/scheduler/src/index.ts` 中的 `unstable_scheduleCallback`：
 *   当外部调度新任务时，创建 Task 节点并通过 `push(taskQueue, newTask)` 加入任务队列。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. `heap.push(node)`：先将新节点追加到数组末尾（完全二叉树的最末叶子位置）。
 * 2. `siftUp(heap, node, index)`：对新追加的节点执行向上冒泡比较与交换，将其提升到合规位置。
 *
 * @param heap 目标堆数组
 * @param node 待添加的节点
 * @returns 无返回值（void）。产生副作用：原地修改 heap 数组，heap.length 增加 1，维持小顶堆性质。时间复杂度 O(log n)。
 */
export declare function push<T extends HeapNode>(heap: Heap<T>, node: T): void;
/**
 * 读取堆顶节点（不弹出）
 *
 * @description
 * 获取当前堆中优先级最高（sortIndex 最小）的节点，但不对堆做任何修改。
 *
 * @callsite 主要调用位置：
 * - `packages/scheduler/src/index.ts` 中的 `workLoop`：
 *   在每个时间切片的工作循环中，使用 `peek(taskQueue)` 检查下一个最紧急的任务及其过期状态。
 *
 * @internal 内部调用的方法及逻辑：
 * - 直接访问数组首项 `heap[0]`。
 *
 * @param heap 目标堆数组
 * @returns 若堆为空返回 `null`；若不为空返回堆顶节点 `T`。无副作用，时间复杂度 O(1)。
 */
export declare function peek<T extends HeapNode>(heap: Heap<T>): T | null;
/**
 * 弹出并返回堆顶节点
 *
 * @description
 * 移除并返回堆中优先级最高的节点，将堆末尾节点置于堆顶后执行下沉调整，恢复小顶堆特性。
 *
 * @callsite 主要调用位置：
 * - `packages/scheduler/src/index.ts` 中的 `workLoop`：
 *   当某个任务执行完成，或者任务没有继续返回延续函数（即不需要再次让出重入）时，调用 `pop(taskQueue)` 将其移出队列。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 获取首项 `const first = heap[0]`。
 * 2. `heap.pop()!`：移除并取出数组末尾的最后一个节点。
 * 3. `siftDown(heap, last, 0)`：若堆中不止一个元素，将末尾节点暂时置于堆顶索引 0，然后调用 `siftDown` 将其向下调整到正确位置。
 *
 * @param heap 目标堆数组
 * @returns 弹出并返回原堆顶节点 `T`；若堆为空则返回 `null`。产生副作用：原地修改 heap 数组，heap.length 减少 1。时间复杂度 O(log n)。
 */
export declare function pop<T extends HeapNode>(heap: Heap<T>): T | null;
//# sourceMappingURL=SchedulerMinHeap.d.ts.map