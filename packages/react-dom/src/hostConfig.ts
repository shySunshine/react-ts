import { HostConfig, FiberNode } from '@react-ts/react-reconciler';
import { elementPropsKey } from './syntheticEvent';

/**
 * 浏览器 DOM 环境下的 HostConfig 实现
 * 
 * @description
 * React Reconciler 是跨平台的协调引擎（支持 DOM、Native、Canvas 等）。
 * `domHostConfig` 实现了协调器所依赖的原生 DOM 操作接口，负责实际创建、插入、更新和删除浏览器真实 DOM 节点。
 */
export const domHostConfig: HostConfig = {
  /**
   * 创建原生 DOM 元素实例
   * 
   * @callsite 主要调用位置：
   * - `packages/react-reconciler/src/completeWork.ts`：在 HostComponent 节点的完成工作阶段调用。
   * 
   * @internal 内部调用的方法及逻辑：
   * 1. 调用 `document.createElement(type)` 创建 DOM 元素。
   * 2. 调用 `updateDOMProperties(element, {}, props)` 初始化所有属性与样式。
   * 3. 将 `props` 挂载到 DOM 元素的自定义字段 `[elementPropsKey]` 上，供合成事件代理系统拾取。
   * 
   * @param type 标签名（如 'div', 'button'）
   * @param props 元素初始属性
   * @returns 创建出的真实 DOM 元素
   */
  createInstance(type: string, props: any): Element {
    const element = document.createElement(type);
    updateDOMProperties(element, {}, props);
    (element as any)[elementPropsKey] = props;
    return element;
  },

  /**
   * 创建原生 DOM 文本节点实例
   * 
   * @callsite 主要调用位置：
   * - `packages/react-reconciler/src/completeWork.ts`：在 HostText 节点的完成工作阶段调用。
   * 
   * @param content 文本内容
   * @returns 创建出的真实 DOM Text 节点
   */
  createTextInstance(content: string | number): Text {
    return document.createTextNode(String(content));
  },

  /**
   * 在离屏构建阶段将子 DOM 节点追加到父 DOM 节点中
   * 
   * @callsite 主要调用位置：
   * - `packages/react-reconciler/src/completeWork.ts`：初次挂载时自底向上将所有子 DOM 构建为完整的离屏子树。
   * 
   * @param parent 父 DOM 元素
   * @param child 子 DOM 元素或文本节点
   */
  appendInitialChild(parent: Element, child: Element | Text): void {
    parent.appendChild(child);
  },

  /**
   * 将子 DOM 节点追加到顶层挂载容器中
   * 
   * @callsite 主要调用位置：
   * - `packages/react-reconciler/src/commitWork.ts`：Commit 阶段处理 Placement 副作用，挂载到容器末尾。
   * 
   * @param container 容器 DOM 元素
   * @param child 待插入的子 DOM 节点
   */
  appendChildToContainer(container: Element, child: Element | Text): void {
    container.appendChild(child);
  },

  /**
   * 将子 DOM 节点插入到容器中指定兄弟节点之前
   * 
   * @callsite 主要调用位置：
   * - `packages/react-reconciler/src/commitWork.ts`：Commit 阶段处理 Placement 移动或插入到非末尾位置。
   * 
   * @param container 容器 DOM 元素
   * @param child 待插入的子 DOM 节点
   * @param before 插入位置之前的参考 DOM 节点
   */
  insertChildToContainer(container: Element, child: Element | Text, before: Element | Text): void {
    container.insertBefore(child, before);
  },

  /**
   * 从父 DOM 节点中移除指定的子 DOM 节点
   * 
   * @callsite 主要调用位置：
   * - `packages/react-reconciler/src/commitWork.ts`：Commit 阶段处理 ChildDeletion 副作用。
   * 
   * @param parent 父 DOM 元素
   * @param child 待删除的子 DOM 节点
   */
  removeChild(parent: Element, child: Element | Text): void {
    parent.removeChild(child);
  },

  /**
   * 提交 DOM 属性更新
   * 
   * @callsite 主要调用位置：
   * - `packages/react-reconciler/src/commitWork.ts`：Commit 阶段处理带有 Update 标记的 HostComponent 节点。
   * 
   * @internal 内部调用的方法及逻辑：
   * 1. 取出旧属性 `oldProps` 与新属性 `fiber.pendingProps`。
   * 2. 调用 `updateDOMProperties(dom, oldProps, fiber.pendingProps)` 对比差异并更新 DOM 属性与样式。
   * 3. 同步更新 DOM 节点上的 `[elementPropsKey]` 属性引用。
   * 
   * @param fiber 发生更新的 FiberNode
   */
  commitUpdate(fiber: FiberNode): void {
    const dom = fiber.stateNode as Element;
    if (dom !== null) {
      const oldProps = fiber.alternate !== null ? (fiber.alternate.memoizedProps || {}) : {};
      updateDOMProperties(dom, oldProps, fiber.pendingProps);
      (dom as any)[elementPropsKey] = fiber.pendingProps;
    }
  },

  /**
   * 提交文本节点的内容更新
   * 
   * @callsite 主要调用位置：
   * - `packages/react-reconciler/src/commitWork.ts`：Commit 阶段更新 HostText 节点的文本内容。
   * 
   * @param textInstance 目标文本节点
   * @param content 新的文本字符串或数值
   */
  commitTextUpdate(textInstance: Text, content: string | number): void {
    textInstance.nodeValue = String(content);
  }
};

/**
 * 无需自动补充 'px' 单位的 CSS 属性白名单集合
 */
const isUnitlessNumber: Record<string, boolean> = {
  animationIterationCount: true,
  aspectRatio: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  columns: true,
  flex: true,
  flexGrow: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  flexOrder: true,
  gridArea: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowSpan: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnSpan: true,
  gridColumnStart: true,
  fontWeight: true,
  lineClamp: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true
};

/**
 * 格式化样式属性值
 * 
 * @description
 * 若值为数值且属性名不在 `isUnitlessNumber` 白名单中，自动补充 'px' 后缀（如 `width: 100` -> `100px`）。
 * 
 * @param key CSS 驼峰属性名（如 'width', 'opacity'）
 * @param value 属性值
 * @returns 格式化后的 CSS 字符串值
 */
function formatStyleValue(key: string, value: any): string {
  if (typeof value === 'number' && value !== 0 && !isUnitlessNumber[key]) {
    return value + 'px';
  }
  return value == null ? '' : '' + value;
}

/**
 * 差异化对比并更新 DOM 元素的原生属性和内联样式
 * 
 * @description
 * 对比新旧两份 props，高效更新真实 DOM：
 * 1. 遍历旧属性：若在新属性中不存在，执行清除操作（removeAttribute、清空 style 等）。
 * 2. 遍历新属性：若与旧值不相等，执行设值操作（处理 value/checked 受控属性、className、style 对象展开与布尔属性等）。
 * 
 * @param dom 目标真实 DOM 元素
 * @param prevProps 上一次渲染生效的 props
 * @param nextProps 本次即将生效的新 props
 */
function updateDOMProperties(dom: Element, prevProps: any, nextProps: any) {
  // 1. 清理已删除的属性
  for (const prop in prevProps) {
    if (prop === 'children') continue;
    if (prop.startsWith('on')) continue; // 事件绑定由合成事件系统接管

    if (!(prop in nextProps)) {
      if (prop === 'className') {
        dom.removeAttribute('class');
      } else if (prop === 'style') {
        (dom as HTMLElement).removeAttribute('style');
      } else if (prop === 'value' && (dom.tagName === 'INPUT' || dom.tagName === 'TEXTAREA')) {
        (dom as HTMLInputElement).value = '';
      } else {
        dom.removeAttribute(prop);
      }
    }
  }

  // 2. 设置新增或更新的属性
  for (const prop in nextProps) {
    if (prop === 'children') continue;
    if (prop.startsWith('on')) continue;

    const prevValue = prevProps[prop];
    const nextValue = nextProps[prop];

    if (prop === 'value' && (dom.tagName === 'INPUT' || dom.tagName === 'TEXTAREA')) {
      const stringValue = nextValue == null ? '' : String(nextValue);
      if ((dom as HTMLInputElement).value !== stringValue) {
        (dom as HTMLInputElement).value = stringValue;
      }
    } else if (prop === 'checked' && dom.tagName === 'INPUT') {
      const boolValue = Boolean(nextValue);
      if ((dom as HTMLInputElement).checked !== boolValue) {
        (dom as HTMLInputElement).checked = boolValue;
      }
    } else if (prevValue !== nextValue) {
      if (prop === 'className') {
        dom.setAttribute('class', nextValue || '');
      } else if (prop === 'style') {
        if (typeof nextValue === 'string') {
          (dom as HTMLElement).style.cssText = nextValue;
        } else if (typeof nextValue === 'object' && nextValue !== null) {
          const style = (dom as HTMLElement).style;
          for (const s in nextValue) {
            (style as any)[s] = formatStyleValue(s, nextValue[s]);
          }
        }
      } else if (typeof nextValue === 'boolean') {
        if (nextValue) {
          dom.setAttribute(prop, '');
        } else {
          dom.removeAttribute(prop);
        }
      } else {
        dom.setAttribute(prop, nextValue);
      }
    }
  }
}

