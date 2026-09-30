import { REACT_ELEMENT_TYPE, Type, Key, Ref, Props, ReactElement } from '@react-ts/shared';

/**
 * 经典 React 元素创建函数 (React.createElement)
 * 
 * @description
 * 传统的 JSX 转换（如 Babel 经典转换模式 `runtime: 'classic'`）或手动编写代码时调用的元素工厂函数。
 * 提取 config 中的 key、ref 并将其余用户属性及动态 children 封装进 props 中，构造并返回虚拟 DOM 节点。
 * 
 * @callsite 主要调用位置：
 * - 开发者手动调用 `React.createElement(type, config, ...children)`。
 * - 传统编译器将 `<div className="box">Hello</div>` 转换为 `React.createElement('div', { className: 'box' }, 'Hello')`。
 * 
 * @internal 内部调用的方法及逻辑：
 * 1. 从 `config` 中分离提取 `key`（转为字符串）和 `ref`。
 * 2. 浅拷贝遍历 `config` 自身属性（排除 `key` 和 `ref`）到 `props` 对象中。
 * 3. 处理可变长度的 `children` 参数：单个子节点直接赋值 `props.children = children[0]`；多个子节点赋值为数组 `props.children = children`。
 * 4. 返回带有 `$$typeof: REACT_ELEMENT_TYPE` 的合法 `ReactElement` 对象。
 * 
 * @param type 元素类型（如 'div', 'span' 或自定义组件函数/类）
 * @param config 包含属性、key、ref 的配置对象
 * @param children 子节点列表（支持多个传参）
 * @returns 返回一个符合规范的 `ReactElement` 虚拟 DOM 对象
 */
export function createElement(type: Type, config?: any, ...children: any[]): ReactElement {
  let key: Key = null;
  let ref: Ref = null;
  const props: Props = {};

  if (config != null) {
    if (config.key !== undefined) {
      key = '' + config.key;
    }
    if (config.ref !== undefined) {
      ref = config.ref;
    }
    for (const propName in config) {
      if (
        Object.prototype.hasOwnProperty.call(config, propName) &&
        propName !== 'key' &&
        propName !== 'ref'
      ) {
        props[propName] = config[propName];
      }
    }
  }

  const childrenLength = children.length;
  if (childrenLength === 1) {
    props.children = children[0];
  } else if (childrenLength > 1) {
    props.children = children;
  }

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props
  };
}

/**
 * 现代 React JSX 运行时转换函数 (jsx / jsx-runtime)
 * 
 * @description
 * React 17+ 引入的新 JSX 转换运行时入口（`react/jsx-runtime`）。
 * 编译器会自动将 `<div key="k" id="app"><span>1</span></div>` 转换为：
 * `jsx('div', { id: 'app', children: jsx('span', { children: 1 }) }, 'k')`。
 * 
 * @callsite 主要调用位置：
 * - 现代构建工具（Vite, Babel, SWC, TypeScript 4.1+ 且配置 `jsx: 'react-jsx'`）在编译 JSX 代码时自动调用。
 * 
 * @internal 内部调用的方法及逻辑：
 * 1. 优先从第三个显式参数 `maybeKey` 提取 `key`；若未传则从 `config.key` 提取。
 * 2. 从 `config` 中提取 `ref`。
 * 3. 浅拷贝 `config` 中的属性到 `props`（排除 `key` 和 `ref`）。注意 children 已经由编译器打包在 `config.children` 中，无需特殊转换。
 * 4. 组装并返回合法的 `ReactElement` 对象。
 * 
 * @param type 元素类型（原生标签名或组件）
 * @param config 包含组件 props 与 children 的配置对象
 * @param maybeKey 编译器单独提取的 key（若存在）
 * @returns 返回一个符合规范的 `ReactElement` 虚拟 DOM 对象
 */
export function jsx(type: Type, config: any, maybeKey?: any): ReactElement {
  let key: Key = null;
  let ref: Ref = null;
  const props: Props = {};

  if (maybeKey !== undefined) {
    key = '' + maybeKey;
  }

  for (const propName in config) {
    const val = config[propName];
    if (propName === 'key') {
      if (val !== undefined) {
        key = '' + val;
      }
      continue;
    }
    if (propName === 'ref') {
      if (val !== undefined) {
        ref = val;
      }
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(config, propName)) {
      props[propName] = val;
    }
  }

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props
  };
}

/**
 * 静态多子节点 JSX 转换别名 (jsxs)
 * 
 * @description
 * 现代 JSX 编译器对于具有静态多个子节点的元素（如 `<div><p/><p/></div>`）会调用 `jsxs`。
 * 在我们的精简实现中，其实现与 `jsx` 行为完全一致。
 */
export const jsxs = jsx;

/**
 * 开发环境 JSX 转换别名 (jsxDEV)
 * 
 * @description
 * 开发模式下附带 `__source` 和 `__self` 调试信息的 JSX 创建入口，指向基础 `jsx` 函数。
 */
export const jsxDEV = jsx;

/**
 * JSX 命名空间扩充
 */
export namespace JSX {
  export type Element = ReactElement;
  export interface ElementClass {
    render(): any;
  }
  export interface ElementAttributesProperty {
    props: {};
  }
  export interface ElementChildrenAttribute {
    children: {};
  }
  export interface IntrinsicAttributes {
    key?: Key;
    ref?: Ref;
  }
  export interface IntrinsicElements {
    [elemName: string]: any;
  }
}

