import { ReactElement } from '@react-ts/shared';
/**
 * 校验传入对象是否为合法的 ReactElement
 *
 * @description
 * 检查对象非空、为 object 类型且其 `$$typeof` 属性严格等于 `REACT_ELEMENT_TYPE`。
 *
 * @callsite 主要调用位置：
 * - `Children.only`：断言参数必须为合法元素。
 * - `cloneElement`：克隆前对目标元素进行安全性检查。
 * - Reconciler 协调器中的子节点 Diff 与更新判断。
 *
 * @param object 任意待校验的目标对象
 * @returns 类型保护谓词 `object is ReactElement`，若为 true 则 TypeScript 自动收窄类型
 */
export declare function isValidElement(object: any): object is ReactElement;
/**
 * 基于已有的 ReactElement 克隆并返回一个新元素
 *
 * @description
 * 以 `element` 作为样板克隆出一个新元素，保留原始元素的 key 和 ref（除非在 config 中显式重写），
 * 并将原始 `props` 与传入的 `config` 属性合并。若传入了新的 `children`，则会覆盖原本的 `props.children`。
 *
 * @callsite 主要调用位置：
 * - 父组件需要向子元素动态注入额外 props（例如高阶组件、RadioGroup 向 Radio 注入 name/checked 回调）。
 *
 * @internal 内部调用的方法及逻辑：
 * 1. 调用 `isValidElement(element)` 校验合法性，若非法抛出 Error。
 * 2. 浅拷贝原始 props：`props = Object.assign({}, element.props)`。
 * 3. 继承原始 `key` 与 `ref`。
 * 4. 若 `config != null`：
 *    - 优先覆盖 `ref` 与 `key`。
 *    - 遍历 `config` 自身属性，过滤保留关键字（`key`, `ref`, `__self`, `__source`），将其余属性合并覆盖到 `props` 中。
 * 5. 处理新的 `children` 参数，若存在则覆盖 `props.children`。
 * 6. 返回新的 `ReactElement` 对象。
 *
 * @param element 待克隆的原始 ReactElement
 * @param config 新的属性配置对象（可重写 props, key, ref）
 * @param children 替换原始 children 的新子节点
 * @returns 具有合并后 props/key/ref 的全新 ReactElement
 */
export declare function cloneElement(element: ReactElement, config?: any, ...children: any[]): ReactElement;
//# sourceMappingURL=cloneElement.d.ts.map