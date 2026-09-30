import { createRoot } from './client';
import { createPortal } from './portal';
export * from './client';
export * from './syntheticEvent';
export * from './portal';
/**
 * 当前 ReactDOM-ts 运行时版本号
 */
export const version = '18.3.1-ts';
/**
 * 默认导出的 ReactDOM 顶层对象
 */
const ReactDOM = {
    createRoot,
    createPortal,
    version
};
export default ReactDOM;
//# sourceMappingURL=index.js.map