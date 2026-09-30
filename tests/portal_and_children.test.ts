import { describe, it, expect } from 'vitest';
import { createPortal } from '../packages/react-dom/src/portal';
import { cloneElement, isValidElement } from '../packages/react/src/cloneElement';
import { Children } from '../packages/react/src/children';
import { createElement } from '../packages/react/src/jsx';
import { REACT_PORTAL_TYPE, REACT_ELEMENT_TYPE } from '@react-ts/shared';

describe('Portal 与 Children / cloneElement 单测', () => {
  it('createPortal 应正确构造带有 REACT_PORTAL_TYPE 与 containerInfo 的虚拟节点', () => {
    const fakeContainer = { nodeType: 1, tagName: 'BODY' } as any;
    const portal = createPortal(createElement('div', null, 'Portal Content'), fakeContainer, 'modal-key');

    expect(portal.$$typeof).toBe(REACT_PORTAL_TYPE);
    expect(portal.key).toBe('modal-key');
    expect((portal as any).containerInfo).toBe(fakeContainer);
    expect(portal.props.children).not.toBeNull();
  });

  it('isValidElement 应精准辨析是否为合法 React 元素', () => {
    const valid = createElement('span', { className: 'test' }, 'hello');
    expect(isValidElement(valid)).toBe(true);
    expect(isValidElement(null)).toBe(false);
    expect(isValidElement('plain string')).toBe(false);
    expect(isValidElement({ type: 'div' })).toBe(false);
  });

  it('cloneElement 应正确复制并覆盖 Props 与 Key', () => {
    const original = createElement('button', { disabled: false, id: 'btn' }, 'Click');
    const cloned = cloneElement(original, { disabled: true, className: 'primary' }, 'Updated');

    expect(cloned.type).toBe('button');
    expect(cloned.props.id).toBe('btn');
    expect(cloned.props.disabled).toBe(true);
    expect(cloned.props.className).toBe('primary');
    expect(cloned.props.children).toBe('Updated');
  });

  it('Children 实用工具函数集成测试', () => {
    const c1 = createElement('div', { key: '1' }, 'one');
    const c2 = createElement('div', { key: '2' }, 'two');
    const children = [c1, [c2, null, undefined]];

    // 1. toArray 展开并过滤空值
    const array = Children.toArray(children);
    expect(array.length).toBe(2);
    expect(array[0]).toBe(c1);
    expect(array[1]).toBe(c2);

    // 2. count
    expect(Children.count(children)).toBe(2);

    // 3. map
    const mapped = Children.map(children, (child, idx) => `${child.props.children}-${idx}`);
    expect(mapped).toEqual(['one-0', 'two-1']);

    // 4. only
    expect(Children.only(c1)).toBe(c1);
    expect(() => Children.only(children as any)).toThrow();
  });
});
