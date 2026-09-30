import React, {
  useState,
  useContext,
  createContext,
  forwardRef,
  useRef,
  useImperativeHandle,
  useLayoutEffect,
  useId,
  Children,
  cloneElement
} from 'react';
import { createPortal } from 'react-dom';

// 1. Context API 测试：主题上下文
interface ThemeConfig {
  accent: string;
  badge: string;
}
const ThemeContext = createContext<ThemeConfig>({
  accent: 'from-blue-600 to-indigo-600',
  badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
});

// 2. forwardRef + useImperativeHandle + useId 测试：复合输入框
export interface CustomInputHandle {
  focus: () => void;
  reset: () => void;
}

const AccessibleInput = forwardRef<CustomInputHandle, { label: string; placeholder?: string }>(
  ({ label, placeholder }, ref) => {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [value, setValue] = useState('');

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      reset: () => {
        setValue('');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        inputRef.current?.focus();
      }
    }));


    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-xs font-medium text-slate-300 flex items-center justify-between">
          <span>{label}</span>
          <span className="font-mono text-[10px] text-slate-500">useId: {inputId}</span>
        </label>
        <div className="relative">
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e: any) => setValue(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
          />
        </div>
      </div>
    );
  }
);

// 3. Children.map + cloneElement 测试：无侵入 Tab 切换组件
interface TabProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}
function TabItem({ label, isActive, onClick }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
          ? 'bg-white/10 text-white shadow-sm border border-white/10 font-semibold'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }`}
    >
      {label}
    </button>
  );
}

function TabsGroup({ activeIndex, onChange, children }: { activeIndex: number; onChange: (idx: number) => void; children: any }) {
  return (
    <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5 w-fit">
      {Children.map(children, (child, idx) => {
        return cloneElement(child, {
          isActive: idx === activeIndex,
          onClick: () => onChange(idx)
        });
      })}
    </div>
  );
}

// 4. Modal 传送门组件 (createPortal)
function ModalDialog({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: any }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="text-sm text-slate-300">{children}</div>
        <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            确认关闭
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// 5. 综合演示面板
export function CaseComponentLibrary() {
  const [themeIdx, setThemeIdx] = useState(0);
  const [tabIdx, setTabIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const inputRef = useRef<CustomInputHandle | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const themes: ThemeConfig[] = [
    { accent: 'from-indigo-500 to-violet-600', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    { accent: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { accent: 'from-amber-500 to-rose-600', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
  ];

  const currentTheme = themes[themeIdx];

  // useLayoutEffect：同步测算 DOM 盒模型尺寸 (无闪烁)
  useLayoutEffect(() => {
    if (boxRef.current) {
      setMeasuredWidth(boxRef.current.getBoundingClientRect().width);
    }
  }, [tabIdx, themeIdx]);

  return (
    <ThemeContext.Provider value={currentTheme}>
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col gap-6 backdrop-blur-md">
        {/* 标题 */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono text-xs">UI Suite</span>
              <h2 className="text-lg font-bold text-white">主流 UI 组件库核心机制验证</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              验证 Context 树透传、forwardRef、useImperativeHandle、useId、Children/cloneElement 与 createPortal
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">切换主题 Context:</span>
            {themes.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setThemeIdx(idx)}
                className={`w-6 h-6 rounded-full bg-gradient-to-r ${t.accent} border ${idx === themeIdx ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                  } transition-all`}
              />
            ))}
          </div>
        </div>

        {/* 区域 1: Children.map + cloneElement 实现的选项卡 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">1. 复合组件选项卡 (Children.map + cloneElement):</span>
            <TabsGroup activeIndex={tabIdx} onChange={setTabIdx}>
              <TabItem label="表单与引用 (Ref & ID)" />
              <TabItem label="Layout 同步测量" />
              <TabItem label="Portal 传送门" />
            </TabsGroup>
          </div>

          <div
            ref={boxRef}
            className="p-5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-4 min-h-[160px] justify-center"
          >
            {tabIdx === 0 && (
              <div className="flex flex-col gap-3 max-w-md">
                <AccessibleInput ref={inputRef} label="用户自定义无障碍输入框" placeholder="请输入任意内容..." />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => inputRef.current?.focus()}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-all"
                  >
                    调用句柄 .focus()
                  </button>
                  <button
                    onClick={() => inputRef.current?.reset()}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium transition-all"
                  >
                    调用句柄 .reset()
                  </button>
                </div>
              </div>
            )}

            {tabIdx === 1 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">通过 useLayoutEffect 在绘制前测量的当前卡片真实宽度:</span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                    {Math.round(measuredWidth)} px
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  useLayoutEffect 在 DOM Mutation 之后、浏览器 Paint 之前同步清空，保证获取 DOM 布局时不发生肉眼可见闪烁。
                </p>
              </div>
            )}

            {tabIdx === 2 && (
              <div className="flex flex-col gap-3 items-start">
                <p className="text-xs text-slate-300">
                  createPortal 能够将弹窗节点脱离当前的组件树层级，直接挂载到 <code className="text-indigo-400 font-mono">document.body</code> 下。
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all"
                >
                  打开 Portal 模态弹窗
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 区域 2: Context 消费状态展示 */}
        <ContextConsumerCard />

        {/* 传送门弹窗实体 */}
        <ModalDialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="脱离层级 Portal 模态弹窗"
        >
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              此弹窗已成功通过 <code className="font-mono text-indigo-400">ReactDOM.createPortal</code> 挂载在顶级 <code className="font-mono text-emerald-400">&lt;body&gt;</code> 容器中！
            </p>
            <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] text-slate-400 font-mono">
              DOM 路径: document.body &gt; div.fixed
            </div>
          </div>
        </ModalDialog>
      </div>
    </ThemeContext.Provider>
  );
}

// 演示多层嵌套消费 ThemeContext
function ContextConsumerCard() {
  const theme = useContext(ThemeContext);

  return (
    <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">当前深层子组件通过 useContext 读取的上下文徽标:</span>
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${theme.badge} transition-all`}>
          动态 Context 样式注入正常
        </span>
      </div>
      <span className="text-[11px] font-mono text-slate-500">Provider &rarr; Consumer 传递闭环</span>
    </div>
  );
}
