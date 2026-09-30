/**
 * 现代标准合成事件系统 (SyntheticEvent System)
 *
 * @description
 * 借鉴 React 17+ 架构，将所有事件集中委托在应用挂载根容器（Root container）上，
 * 而不是绑定在每个单独的 DOM 节点或全局 document 上（更利于多 React 根实例并存与微前端隔离）。
 * 支持完整的捕获（Capture）与冒泡（Bubble）两阶段收集与模拟派发，以及 `stopPropagation` 阻止传播控制。
 */
/** DOM 元素上挂载 React props 的私有属性 key */
export const elementPropsKey = '__reactProps';
/**
 * 支持代理的所有合法原生事件类型列表
 */
const validEventList = [
    'click',
    'input',
    'change',
    'keydown',
    'keyup',
    'mousedown',
    'mouseup',
    'focusin',
    'focusout',
    'scroll',
    'submit',
    'reset',
    'compositionstart',
    'compositionend'
];
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
export function initEvent(container, eventType) {
    container.addEventListener(eventType, (e) => {
        dispatchEvent(container, eventType, e);
    });
}
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
export function initAllEvents(container) {
    validEventList.forEach((eventType) => {
        initEvent(container, eventType);
    });
}
/**
 * 根容器事件派发中枢
 *
 * @description
 * 当原生事件冒泡到根容器时触发：
 * 1. 沿 DOM 树向上遍历，收集沿途所有组件声明的捕获回调和冒泡回调。
 * 2. 构造合成事件包装对象 `se`。
 * 3. 先按祖先到子孙的顺序执行捕获监听器（`capture`）。
 * 4. 若未被 `stopPropagation()` 阻断，再按子孙到祖先的顺序执行冒泡监听器（`bubble`）。
 *
 * @param container 根 DOM 容器
 * @param eventType 原生事件名称
 * @param nativeEvent 浏览器原生 Event 对象
 */
function dispatchEvent(container, eventType, nativeEvent) {
    const targetElement = nativeEvent.target;
    if (targetElement === null)
        return;
    // 1. 沿 DOM 路径自底向上收集 listeners (冒泡与捕获)
    const { bubble, capture } = collectPaths(targetElement, container, eventType);
    // 2. 构造合成事件对象
    const se = createSyntheticEvent(nativeEvent);
    // 3. 执行捕获阶段监听器
    triggerEventFlow(capture, se);
    if (!se.isPropagationStopped) {
        // 4. 执行冒泡阶段监听器
        triggerEventFlow(bubble, se);
    }
}
/**
 * 沿 DOM 树自底向上收集触发路径上的所有事件监听器
 *
 * @description
 * 从触发事件的 `targetElement` 开始，一直向上查找到 `container` 容器节点。
 * 对于沿途的每一个 DOM 元素，从其 `[elementPropsKey]` 中提取对应的事件回调：
 * - 捕获回调（如 `onClickCapture`）：使用 `unshift` 插入数组头部，保证最外层祖先最先执行。
 * - 冒泡回调（如 `onClick`）：使用 `push` 追加到数组尾部，保证最内层子元素最先执行。
 *
 * @param targetElement 触发事件的最底层目标 DOM
 * @param container 代理事件的根 DOM 容器
 * @param eventType 原生事件名称
 * @returns 包含捕获队列 `capture` 与冒泡队列 `bubble` 的对象
 */
function collectPaths(targetElement, container, eventType) {
    const result = {
        bubble: [],
        capture: []
    };
    let cur = targetElement;
    while (cur !== null) {
        const elementProps = cur[elementPropsKey];
        if (elementProps) {
            const callbackNames = getEventCallbackNamesFromEventType(eventType);
            for (const callbackName of callbackNames) {
                // 捕获回调: onClickCapture
                const captureCallback = elementProps[callbackName + 'Capture'];
                if (captureCallback) {
                    result.capture.unshift(captureCallback);
                }
                // 冒泡回调: onClick
                const bubbleCallback = elementProps[callbackName];
                if (bubbleCallback) {
                    result.bubble.push(bubbleCallback);
                }
            }
        }
        if (cur === container) {
            break;
        }
        cur = cur.parentElement;
    }
    return result;
}
/**
 * 按序执行事件流中的监听器函数
 *
 * @description
 * 顺序调用数组中的回调函数。若某次调用中触发了 `se.stopPropagation()`，则立即中断后续执行。
 *
 * @param paths 待执行的函数列表
 * @param se 合成事件对象
 */
function triggerEventFlow(paths, se) {
    for (let i = 0; i < paths.length; i++) {
        const callback = paths[i];
        callback.call(null, se);
        if (se.isPropagationStopped) {
            break;
        }
    }
}
/**
 * 创建并初始化合成事件对象 (SyntheticEvent)
 *
 * @description
 * 对原生 Event 进行包装，附加 `isPropagationStopped` 标识，并重写 `stopPropagation` 和 `preventDefault`。
 *
 * @param e 浏览器原生 Event
 * @returns 统一封装后的 SyntheticEvent
 */
function createSyntheticEvent(e) {
    const syntheticEvent = {
        nativeEvent: e,
        type: e.type,
        target: e.target,
        currentTarget: e.currentTarget,
        bubbles: e.bubbles,
        cancelable: e.cancelable,
        defaultPrevented: e.defaultPrevented,
        isPropagationStopped: false,
        stopPropagation() {
            syntheticEvent.isPropagationStopped = true;
            if (e.stopPropagation) {
                e.stopPropagation();
            }
        },
        preventDefault() {
            syntheticEvent.defaultPrevented = true;
            if (e.preventDefault) {
                e.preventDefault();
            }
        }
    };
    return syntheticEvent;
}
/**
 * 将原生事件名映射为 React JSX 属性中的回调名称
 *
 * @description
 * 例如将原生 'click' 映射为 'onClick'，将 'input' 映射为 'onChange' 和 'onInput'。
 *
 * @param eventType 原生事件名称
 * @returns 对应的 React 属性回调名称数组
 */
function getEventCallbackNamesFromEventType(eventType) {
    if (eventType === 'input') {
        return ['onChange', 'onInput'];
    }
    const mapping = {
        click: 'onClick',
        change: 'onChange',
        keydown: 'onKeyDown',
        keyup: 'onKeyUp',
        mousedown: 'onMouseDown',
        mouseup: 'onMouseUp',
        focusin: 'onFocus',
        focusout: 'onBlur',
        scroll: 'onScroll',
        submit: 'onSubmit',
        reset: 'onReset',
        compositionstart: 'onCompositionStart',
        compositionend: 'onCompositionEnd'
    };
    const name = mapping[eventType];
    return name ? [name] : [];
}
//# sourceMappingURL=syntheticEvent.js.map