/**
 * 现代标准合成事件系统 (SyntheticEvent System)
 *
 * @description
 * 借鉴 React 17+ 架构，将所有事件集中委托在应用挂载根容器（Root container）上，
 * 而不是绑定在每个单独的 DOM 节点或全局 document 上（更利于多 React 根实例并存与微前端隔离）。
 * 支持完整的捕获（Capture）与冒泡（Bubble）两阶段收集与模拟派发，以及 `stopPropagation` 阻止传播控制。
 */
/** DOM 元素上挂载 React props 的私有属性 key */
export declare const elementPropsKey = "__reactProps";
/**
 * 统一的 React 合成事件对象接口
 *
 * @description
 * 磨平不同浏览器底层原生事件差异的跨平台事件包装对象。
 */
export interface SyntheticEvent {
    /** 底层浏览器原生事件对象 */
    nativeEvent: Event;
    /** 事件类型（如 'click', 'input'） */
    type: string;
    /** 触发事件的源 DOM 元素 */
    target: EventTarget | null;
    /** 当前正在处理该事件的 DOM 元素（在模拟冒泡流中变化） */
    currentTarget: EventTarget | null;
    /** 事件是否冒泡 */
    bubbles: boolean;
    /** 是否可取消 */
    cancelable: boolean;
    /** 是否已调用 preventDefault() */
    defaultPrevented: boolean;
    /** 标记是否已调用 stopPropagation() 阻止后续冒泡或捕获 */
    isPropagationStopped: boolean;
    /** 阻止事件在 React 模拟树中的继续冒泡与捕获，并阻止原生事件冒泡 */
    stopPropagation: () => void;
    /** 阻止事件的浏览器默认行为 */
    preventDefault: () => void;
}
/**
 * 在 Root 挂载容器上注册单个原生事件监听
 *
 * @description
 * 将浏览器原生事件监听器绑定到指定的根容器上，当事件发生时统一交由 `dispatchEvent` 进行合成与分发。
 *
 * @callsite 主要调用位置：
 * - `initAllEvents` 遍历注册时调用。
 *
 * @param container 根 DOM 挂载容器
 * @param eventType 原生事件名称（如 'click'）
 */
export declare function initEvent(container: Element, eventType: string): void;
/**
 * 在 Root 挂载容器上批量注册所有支持的合成事件监听
 *
 * @description
 * 遍历 `validEventList` 列表，为容器挂载全部常用原生事件的集中代理。
 *
 * @callsite 主要调用位置：
 * - `packages/react-dom/src/client.ts` 中的 `createRoot` 初始化阶段。
 *
 * @param container 根 DOM 挂载容器
 */
export declare function initAllEvents(container: Element): void;
//# sourceMappingURL=syntheticEvent.d.ts.map