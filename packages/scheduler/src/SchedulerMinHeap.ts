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
export function push<T extends HeapNode>(heap: Heap<T>, node: T): void {
  const index = heap.length;
  heap.push(node);
  siftUp(heap, node, index);
}

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
export function peek<T extends HeapNode>(heap: Heap<T>): T | null {
  return heap.length === 0 ? null : heap[0];
}

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
export function pop<T extends HeapNode>(heap: Heap<T>): T | null {
  if (heap.length === 0) return null;
  const first = heap[0];
  const last = heap.pop()!;
  if (last !== first) {
    heap[0] = last;
    siftDown(heap, last, 0);
  }
  return first;
}

/**
 * 向上调整节点（上浮 / Sift Up）
 * 
 * @description
 * 二叉堆向上堆化操作。新插入节点位于堆末尾，通过循环比较其与父节点的大小，若小于父节点则与父节点交换，直至满足小顶堆性质。
 * 
 * @callsite 主要调用位置：
 * - 仅在 `push` 函数内部调用，在新节点推入数组末尾后触发。
 * 
 * @internal 内部调用的方法及逻辑：
 * 1. 通过位运算 `(index - 1) >>> 1` 计算父节点索引 `parentIndex`。
 * 2. 调用 `compare(parent, node)` 比较父节点和当前节点。
 * 3. 若 `parent > node`，则交换位置 `heap[parentIndex] = node; heap[index] = parent;`，并将 `index` 更新为 `parentIndex` 继续向上追溯；否则直接退出。
 * 
 * @param heap 目标堆数组
 * @param node 待上浮的节点
 * @param i 节点当前在堆中的索引
 * @returns 无返回值（void）。产生副作用：原地更新 heap 数组中的元素顺序。时间复杂度 O(log n)。
 */
function siftUp<T extends HeapNode>(heap: Heap<T>, node: T, i: number): void {
  let index = i;
  while (index > 0) {
    const parentIndex = (index - 1) >>> 1;
    const parent = heap[parentIndex];
    if (compare(parent, node) > 0) {
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      return;
    }
  }
}

/**
 * 向下调整节点（下沉 / Sift Down）
 * 
 * @description
 * 二叉堆向下堆化操作。当堆顶元素被移除并用末尾节点替代后，通过与其左右子节点比较，下沉交换到子节点中较小的一个位置，直至满足小顶堆性质。
 * 
 * @callsite 主要调用位置：
 * - 仅在 `pop` 函数内部调用，在堆顶元素出堆后用于重新调整堆。
 * 
 * @internal 内部调用的方法及逻辑：
 * 1. 计算非叶子节点边界 `halfLength = length >>> 1`，只要 `index < halfLength` 就存在子节点。
 * 2. 计算左子节点索引 `leftIndex = (index << 1) + 1` 与右子节点索引 `rightIndex = leftIndex + 1`。
 * 3. 调用 `compare(left, node)`、`compare(right, left)`、`compare(right, node)` 进行三方比较：
 *    - 如果左子节点小于当前节点：判断右子节点是否更小，若是则与右子节点交换，否则与左子节点交换。
 *    - 如果左子节点不小于当前节点：判断右子节点是否小于当前节点，若是则与右子节点交换。
 *    - 若左右子节点均不小于当前节点，说明堆平衡，结束下沉。
 * 
 * @param heap 目标堆数组
 * @param node 待下沉的节点
 * @param i 节点当前在堆中的索引（通常为 0）
 * @returns 无返回值（void）。产生副作用：原地更新 heap 数组中的元素顺序。时间复杂度 O(log n)。
 */
function siftDown<T extends HeapNode>(heap: Heap<T>, node: T, i: number): void {
  let index = i;
  const length = heap.length;
  const halfLength = length >>> 1;
  while (index < halfLength) {
    const leftIndex = (index << 1) + 1;
    const left = heap[leftIndex];
    const rightIndex = leftIndex + 1;
    const right = heap[rightIndex];

    if (compare(left, node) < 0) {
      if (rightIndex < length && compare(right, left) < 0) {
        heap[rightIndex] = node;
        heap[index] = right;
        index = rightIndex;
      } else {
        heap[leftIndex] = node;
        heap[index] = left;
        index = leftIndex;
      }
    } else if (rightIndex < length && compare(right, node) < 0) {
      heap[rightIndex] = node;
      heap[index] = right;
      index = rightIndex;
    } else {
      return;
    }
  }
}

/**
 * 堆节点排序比较函数
 * 
 * @description
 * 确定两个节点的先后优先级顺序。
 * 排序规则：
 * 1. 优先按 `sortIndex`（通常是任务的过期时间 expirationTime）升序排序（数值越小越优先）。
 * 2. 当 `sortIndex` 相同时，按节点唯一标识 `id` 升序排序（按任务创建先后顺序先进先出 FIFO）。
 * 
 * @callsite 主要调用位置：
 * - 在 `siftUp`（上浮）和 `siftDown`（下沉）算法中被频繁调用，用于决定节点与父/子节点是否需要交换。
 * 
 * @internal 内部调用的方法及逻辑：
 * - 纯数学计算比较：`a.sortIndex - b.sortIndex`，若不为 0 则返回该差值；若为 0 则返回 `a.id - b.id`。
 * 
 * @param a 比较节点 A
 * @param b 比较节点 B
 * @returns `< 0` 表示 a 优先级高于 b（排在前面）；`> 0` 表示 a 优先级低于 b；`0` 表示相等。
 */
function compare<T extends HeapNode>(a: T, b: T): number {
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}

