import { isValidElement } from './cloneElement';
/**
 * 递归展平并过滤 children 的辅助函数
 *
 * @description
 * 深度遍历传入的嵌套 children 结构（如数组套数组），过滤掉 null、undefined 以及布尔值（JSX 中 `{condition && <div/>}` 产生的 false/true），
 * 将所有有效节点展平存入结果数组 `result` 中。
 *
 * @param children 待展平的任意 children 数据
 * @param result 累积展平结果的目标数组
 */
function toArrayHelper(children, result) {
    if (children == null || typeof children === 'boolean') {
        return;
    }
    if (Array.isArray(children)) {
        for (let i = 0; i < children.length; i++) {
            toArrayHelper(children[i], result);
        }
    }
    else {
        result.push(children);
    }
}
/**
 * 将不透明的 children 数据结构转换为扁平的一维数组
 *
 * @description
 * 在 React 中，props.children 可能是单个对象、数组、字符串或 undefined。
 * `Children.toArray` 能够将其安全展平为数组，方便组件进行迭代、排序或切片。
 *
 * @callsite 主要调用位置：
 * - 容器类组件（如 Tabs、List、Carousel）需要获取子元素列表长度或按索引渲染子项时。
 *
 * @internal 内部调用的方法及逻辑：
 * - 初始化空数组 `result = []` 并调用 `toArrayHelper(children, result)` 递归填充。
 *
 * @param children 不透明的 props.children 结构
 * @returns 扁平化且过滤掉 null/undefined/boolean 的有效节点数组
 */
export function toArray(children) {
    const result = [];
    toArrayHelper(children, result);
    return result;
}
/**
 * 遍历映射 children 并返回映射后的新数组
 *
 * @description
 * 安全地对每一个子节点调用映射函数，即使 children 是单个对象或嵌套数组也能正常处理。
 *
 * @callsite 主要调用位置：
 * - 组件需要克隆或为所有子节点统一附加额外属性时（如为所有表单控件附加 onChange）。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 若 `children == null` 直接返回原值。
 * 2. 调用 `toArray(children)` 展平为数组。
 * 3. 使用 `array.map` 调用 `func.call(context, child, index)`。
 *
 * @param children 待处理的子节点集合
 * @param func 映射回调函数
 * @param context 回调函数执行时的 this 上下文
 * @returns 映射产生的新元素数组
 */
export function map(children, func, context) {
    if (children == null) {
        return children;
    }
    const array = toArray(children);
    return array.map((child, index) => {
        return func.call(context, child, index);
    });
}
/**
 * 遍历每一个 child 子节点执行副作用操作
 *
 * @description
 * 类似于 `Children.map`，但不收集返回值，专用于仅需迭代遍历的场景。
 *
 * @param children 待处理的子节点集合
 * @param func 遍历回调函数
 * @param context 回调函数执行时的 this 上下文
 */
export function forEach(children, func, context) {
    if (children == null) {
        return;
    }
    const array = toArray(children);
    array.forEach((child, index) => {
        func.call(context, child, index);
    });
}
/**
 * 计算 children 中有效子节点的总数量
 *
 * @description
 * 展平后返回真实有效子节点的数量（自动忽略 null/undefined/boolean）。
 *
 * @param children 待计数的子节点集合
 * @returns 子节点总数
 */
export function count(children) {
    if (children == null) {
        return 0;
    }
    return toArray(children).length;
}
/**
 * 断言并返回唯一的合法 React 元素子节点
 *
 * @description
 * 严格验证 children 是否为且仅为一个合法的 ReactElement。
 * 若 children 为空、为多个子节点或不是合法元素，则抛出 TypeError。
 *
 * @callsite 主要调用位置：
 * - 要求必须且只能包含单一子节点的组件（如某些 Tooltip、Modal 触发器或 React Router 的部分标签）。
 *
 * @param children 待断言的子节点
 * @returns 唯一的单个合法 ReactElement
 * @throws 当不是唯一的合法 ReactElement 时抛出 Error
 */
export function only(children) {
    if (!isValidElement(children)) {
        throw new Error('React.Children.only expected to receive a single React element child.');
    }
    return children;
}
/**
 * React.Children 辅助工具对象
 */
export const Children = {
    map,
    forEach,
    count,
    only,
    toArray
};
//# sourceMappingURL=children.js.map