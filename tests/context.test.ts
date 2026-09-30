import { describe, it, expect } from 'vitest';
import { createContext } from '../packages/react/src/context';
import { pushProvider, popProvider, readContext } from '../packages/react-reconciler/src/fiberContext';
import { REACT_CONTEXT_TYPE, REACT_PROVIDER_TYPE } from '@react-ts/shared';

describe('React Context 上下文系统单测', () => {
  it('createContext 应正确初始化 Context 与 Provider 结构体', () => {
    const ThemeContext = createContext('light');
    expect(ThemeContext.$$typeof).toBe(REACT_CONTEXT_TYPE);
    expect(ThemeContext._currentValue).toBe('light');
    expect(ThemeContext.Provider.$$typeof).toBe(REACT_PROVIDER_TYPE);
    expect(ThemeContext.Provider._context).toBe(ThemeContext);
  });

  it('pushProvider / popProvider 应支持嵌套 Context 栈入栈与出栈', () => {
    const NumberContext = createContext(0);

    expect(readContext(NumberContext)).toBe(0);

    // 外层 Provider: 赋值 10
    pushProvider(NumberContext, 10);
    expect(readContext(NumberContext)).toBe(10);

    // 内层 Provider: 覆盖为 20
    pushProvider(NumberContext, 20);
    expect(readContext(NumberContext)).toBe(20);

    // 内层出栈: 恢复为 10
    popProvider(NumberContext);
    expect(readContext(NumberContext)).toBe(10);

    // 外层出栈: 恢复为默认值 0
    popProvider(NumberContext);
    expect(readContext(NumberContext)).toBe(0);
  });
});
