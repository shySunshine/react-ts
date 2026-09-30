import { describe, it, expect } from 'vitest';
import { createRef, forwardRef } from '../packages/react/src/ref';
import { FiberNode } from '../packages/react-reconciler/src/fiber';
import { HostComponent, ForwardRef, REACT_FORWARD_REF_TYPE } from '@react-ts/shared';
import { Ref, Layout } from '../packages/react-reconciler/src/fiberFlags';

describe('React Ref 与 Layout 阶段单测', () => {
  it('createRef 应生成带 current: null 的引用对象', () => {
    const ref = createRef<HTMLDivElement>();
    expect(ref).toEqual({ current: null });
  });

  it('forwardRef 应正确封装组件并标记 REACT_FORWARD_REF_TYPE', () => {
    const CustomInput = forwardRef((props: { placeholder?: string }, ref) => {
      return { type: 'input', props: { ...props, ref } };
    });

    expect(CustomInput.$$typeof).toBe(REACT_FORWARD_REF_TYPE);
    expect(typeof CustomInput.render).toBe('function');
  });

  it('FiberNode 挂载 ref 时应具备正确传递能力', () => {
    const hostFiber = new FiberNode(HostComponent, {}, null);
    const myRef = createRef();
    hostFiber.ref = myRef;

    // 模拟挂载实例
    const fakeDOM = { tagName: 'DIV', id: 'app' };
    hostFiber.stateNode = fakeDOM;

    // 挂载 Ref
    if (hostFiber.ref) {
      hostFiber.ref.current = hostFiber.stateNode;
    }
    expect(myRef.current).toBe(fakeDOM);

    // 卸载 Ref
    if (hostFiber.ref) {
      hostFiber.ref.current = null;
    }
    expect(myRef.current).toBeNull();
  });

  it('useImperativeHandle 与 reset 逻辑应正确清空 DOM 与状态', () => {
    let internalState = 'hello';
    const fakeInputDOM = { value: 'hello', focusCalled: false, focus() { this.focusCalled = true; } };

    const ref = createRef<{ reset: () => void; focus: () => void }>();
    const handle = {
      focus: () => {
        fakeInputDOM.focus();
      },
      reset: () => {
        internalState = '';
        fakeInputDOM.value = '';
        fakeInputDOM.focus();
      }
    };

    ref.current = handle;
    expect(fakeInputDOM.value).toBe('hello');
    expect(internalState).toBe('hello');

    ref.current?.reset();
    expect(fakeInputDOM.value).toBe('');
    expect(internalState).toBe('');
    expect(fakeInputDOM.focusCalled).toBe(true);
  });
});

