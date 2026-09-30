import { REACT_MEMO_TYPE } from '@react-ts/shared';
/**
 * 创建具有浅比较优化能力的记忆化组件 (React.memo)
 *
 * @description
 * 类似于 PureComponent，用于包装函数组件。在父组件重渲染时，若 memo 组件的 props 未发生实质改变，
 * 则 Reconciler 会 Bailout（跳过）当前组件及其子树的重新渲染，直接复用上一次的渲染结果。
 *
 * @callsite 主要调用位置：
 * - 开发者优化纯展示组件的性能：`const MemoizedItem = React.memo(Item, arePropsEqual)`。
 *
 * @internal 内部调用的方法及逻辑：
 * - 返回一个具有 `$$typeof: REACT_MEMO_TYPE`、原始 `type` 以及自定义比较函数 `compare` 的对象。
 *
 * @param type 需要被记忆化包装的目标组件
 * @param compare 可选的自定义浅比较函数 `(prevProps, nextProps) => boolean`，返回 true 表示相等（跳过重渲染）
 * @returns 带有 REACT_MEMO_TYPE 标记的 MemoComponentType 包装对象
 */
export function memo(type, compare) {
    return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: compare === undefined ? null : compare
    };
}
//# sourceMappingURL=memo.js.map