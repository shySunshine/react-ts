import { describe, it, expect } from 'vitest';
import { reconcileChildFibers } from '../packages/react-reconciler/src/childFiber';
import { FiberNode } from '../packages/react-reconciler/src/fiber';
import { HostRoot, HostComponent, HostText, REACT_ELEMENT_TYPE } from '@react-ts/shared';
import { Placement, ChildDeletion } from '../packages/react-reconciler/src/fiberFlags';

function createDummyElement(type: string, key: string | null = null, textContent?: string) {
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref: null,
    props: textContent !== undefined ? { children: textContent } : {}
  };
}

describe('React 18 核心 Diff 算法单测', () => {
  it('单节点 Diff: 相同 key 和 type 应复用已有 FiberNode', () => {
    const parentFiber = new FiberNode(HostRoot, {}, null);
    const oldChild = new FiberNode(HostComponent, {}, 'a');
    oldChild.type = 'div';
    oldChild.elementType = 'div';
    parentFiber.child = oldChild;

    const newElement = createDummyElement('div', 'a');
    const newChild = reconcileChildFibers(parentFiber, oldChild, newElement);

    expect(newChild).not.toBeNull();
    expect(newChild?.alternate).toBe(oldChild);
    expect(newChild?.key).toBe('a');
    expect(parentFiber.deletions).toBeNull();
  });

  it('单节点 Diff: key 不同应标记旧节点 ChildDeletion 并创建新 Fiber', () => {
    const parentFiber = new FiberNode(HostRoot, {}, null);
    const oldChild = new FiberNode(HostComponent, {}, 'a');
    oldChild.type = 'div';
    oldChild.elementType = 'div';
    parentFiber.child = oldChild;

    const newElement = createDummyElement('div', 'b');
    const newChild = reconcileChildFibers(parentFiber, oldChild, newElement);

    expect(newChild).not.toBeNull();
    expect(newChild?.alternate).toBeNull();
    expect(newChild?.key).toBe('b');
    expect((newChild?.flags || 0) & Placement).not.toBe(0);
    expect(parentFiber.deletions).toContain(oldChild);
    expect(parentFiber.flags & ChildDeletion).not.toBe(0);
  });

  it('多节点 Diff: 乱序重排 (A, B, C -> B, C, A) 应通过 Map 复用且标记移动', () => {
    const parentFiber = new FiberNode(HostRoot, {}, null);
    
    // 旧列表: A(0), B(1), C(2)
    const oldA = new FiberNode(HostComponent, {}, 'A');
    oldA.type = 'li'; oldA.elementType = 'li'; oldA.index = 0;
    const oldB = new FiberNode(HostComponent, {}, 'B');
    oldB.type = 'li'; oldB.elementType = 'li'; oldB.index = 1;
    const oldC = new FiberNode(HostComponent, {}, 'C');
    oldC.type = 'li'; oldC.elementType = 'li'; oldC.index = 2;

    oldA.sibling = oldB;
    oldB.sibling = oldC;
    parentFiber.child = oldA;

    // 新列表: B, C, A
    const newElements = [
      createDummyElement('li', 'B'),
      createDummyElement('li', 'C'),
      createDummyElement('li', 'A')
    ];

    const firstNewChild = reconcileChildFibers(parentFiber, oldA, newElements);

    expect(firstNewChild?.key).toBe('B');
    expect(firstNewChild?.alternate).toBe(oldB);

    const secondNewChild = firstNewChild?.sibling;
    expect(secondNewChild?.key).toBe('C');
    expect(secondNewChild?.alternate).toBe(oldC);

    const thirdNewChild = secondNewChild?.sibling;
    expect(thirdNewChild?.key).toBe('A');
    expect(thirdNewChild?.alternate).toBe(oldA);

    // A 从位置 0 移到了最后，应打上 Placement 移动标记
    expect((thirdNewChild?.flags || 0) & Placement).not.toBe(0);
    // 无删除节点
    expect(parentFiber.deletions).toBeNull();
  });
});
