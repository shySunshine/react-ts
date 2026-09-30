import { REACT_ELEMENT_TYPE } from './ReactSymbols';

/** 元素类型：如字符串 ('div')、函数组件 (FC)、类组件、Symbol (Fragment/Portal) 等 */
export type Type = any;

/** 唯一标识 key，用于在 Diff 算法中标识节点身份以实现 DOM 复用 */
export type Key = string | number | null | undefined;

/** Ref 引用，支持对象式 ref ({ current: any }) 或回调式 ref */
export type Ref = any;

/** 组件或 HTML 元素的属性集合 */
export type Props = {
  [key: string]: any;
  children?: any;
};

/**
 * React 虚拟 DOM 元素接口 (Virtual DOM Node)
 * 
 * @description
 * 通过 JSX 转换或者 `React.createElement` 创建出的轻量级 JS 对象，
 * 描述 UI 应该呈现的结构，是构建 Fiber 树的输入蓝图。
 */
export interface ReactElement {
  /** 安全防伪标记，固定为 REACT_ELEMENT_TYPE */
  $$typeof: typeof REACT_ELEMENT_TYPE;
  /** 元素类型（如 'div' 或组件函数） */
  type: Type;
  /** 用于 Diff 算法复用节点的唯一 key */
  key: Key;
  /** 用于访问底层 DOM 或组件实例的 ref 引用 */
  ref: Ref;
  /** 传递给元素的属性集（含 children） */
  props: Props;
}

/**
 * 具有 current 属性的 Ref 对象
 */
export interface RefObject<T> {
  current: T;
}

/**
 * React 上下文 (Context) 接口
 */
export interface ReactContext<T> {
  /** 标记为 REACT_CONTEXT_TYPE */
  $$typeof: symbol;
  /** 消费者组件（在 JSX 中为 `<Context.Consumer>`） */
  Consumer: ReactContext<T>;
  /** 生产者组件（在 JSX 中为 `<Context.Provider>`） */
  Provider: ReactProvider<T>;
  /** 当前上下文保存的全局默认/当前值 */
  _currentValue: T;
  /** 调试时在 React DevTools 显示的友好名称 */
  displayName?: string;
}

/**
 * React 上下文提供者 (Provider) 接口
 */
export interface ReactProvider<T> {
  /** 标记为 REACT_PROVIDER_TYPE */
  $$typeof: symbol;
  /** 指向所属的 ReactContext 对象 */
  _context: ReactContext<T>;
  (props: { value: T; children?: any }): any;
}

/**
 * 状态更新 Action：支持直接值或基于旧状态的计算函数 `(prevState) => newState`
 */
export type Action<State> = State | ((prevState: State) => State);

/**
 * React Hooks 运行时分发器接口 (Dispatcher)
 * 
 * @description
 * 包含所有官方支持的 Hook 方法。
 * React 根据组件当前所处的生命周期阶段（Mount 或 Update），在内部动态切换不同的 Dispatcher 实现，
 * 从而使同一个 Hook（如 `useState`）在初次挂载与后续更新时执行不同的逻辑。
 */
export interface Dispatcher {
  /** 声明组件的局部响应式状态 */
  useState<S>(initialState: S | (() => S)): [S, Dispatch<Action<S>>];
  /** 使用 Reducer 模式管理复杂状态 */
  useReducer<S, I, A>(reducer: (state: S, action: A) => S, initialArg: I, init?: (arg: I) => S): [S, (action: A) => void];
  /** 声明副作用操作，在 DOM 变更绘制后异步执行 */
  useEffect(create: () => (() => void) | void, deps?: any[] | null): void;
  /** 声明布局副作用，在 DOM 变更后但在浏览器绘制前同步执行 */
  useLayoutEffect(create: () => (() => void) | void, deps?: any[] | null): void;
  /** 在 DOM 突变前同步触发，专门用于 CSS-in-JS 库注入样式规则 */
  useInsertionEffect(create: () => (() => void) | void, deps?: any[] | null): void;
  /** 返回一个可变的引用对象，其 .current 属性在组件整个生命周期中保持稳定 */
  useRef<T>(initialValue: T): { current: T };
  /** 缓存复杂计算的结果，仅在依赖项改变时重新计算 */
  useMemo<T>(create: () => T, deps?: any[] | null): T;
  /** 缓存回调函数实例，仅在依赖项改变时生成新函数 */
  useCallback<T extends (...args: any[]) => any>(callback: T, deps?: any[] | null): T;
  /** 声明非阻塞的并发过渡更新，返回 [isPending, startTransition] */
  useTransition(): [boolean, (callback: () => void) => void];
  /** 读取并订阅最近的 Context.Provider 的值 */
  useContext<T>(context: ReactContext<T>): T;
  /** 自定义通过 ref 暴露给父组件的实例属性或方法 */
  useImperativeHandle<T, R extends T>(ref: any, init: () => R, deps?: any[] | null): void;
  /** 生成在客户端与服务端之间唯一且稳定的 ID */
  useId(): string;
  /** 订阅外部数据源（如 Redux、Zustand、自定义全局 Store），支持并发安全读取 */
  useSyncExternalStore<Snapshot>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => Snapshot,
    getServerSnapshot?: () => Snapshot
  ): Snapshot;
}

/** 状态派发函数类型 */
export type Dispatch<A> = (action: A) => void;

/**
 * 全局 JSX 命名空间扩充，为 TypeScript 提供 JSX 语法支持与类型校验
 */
declare global {
  namespace JSX {
    interface Element extends ReactElement {}
    interface ElementClass {
      render(): any;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes {
      key?: Key;
      ref?: Ref;
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

