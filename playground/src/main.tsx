import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { CaseInterleaving } from './cases/CaseInterleaving';
import { CaseComponentLibrary } from './cases/CaseComponentLibrary';

function FpsMonitor() {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 500) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const isSmooth = fps >= 55;
  const isFair = fps >= 30;

  return (
    <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3.5 py-1.5 rounded-full font-mono text-xs shadow-inner">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isSmooth
            ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
            : isFair
            ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
            : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
        }`}
      />
      <span
        className={`font-bold ${
          isSmooth ? 'text-emerald-400' : isFair ? 'text-amber-500' : 'text-rose-500'
        }`}
      >
        {fps} FPS
      </span>
      <span className="text-slate-500">主线程刷新率</span>
    </div>
  );
}

function ContinuousSpinner() {
  return (
    <div className="flex items-center gap-3 bg-sky-500/5 border border-sky-500/20 rounded-xl px-4 py-2.5 backdrop-blur-sm">
      <div className="w-6 h-6 border-[3px] border-sky-400/20 border-t-sky-400 rounded-full animate-spin shrink-0" />
      <span className="text-xs sm:text-sm text-slate-400">
        <strong className="font-semibold text-slate-200">流畅度旋转指示器：</strong>
        即使后台有大量 Fiber 正在进行重计算，由于 5ms 时间切片调度，此动画也始终不卡死。
      </span>
    </div>
  );
}

function App() {
  const [activeCase, setActiveCase] = useState<'interleaving' | 'library'>('library');

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-8 flex flex-col gap-6">
      {/* 顶部状态栏 */}
      <header className="flex items-center justify-between flex-wrap gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
              React 18 TypeScript 纯原生生产级内核
            </h1>
            <span className="text-[11px] font-bold bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-2.5 py-0.5 rounded-full shadow-sm">
              v18.3.1-ts Native
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            零 Flow / 零历史冗余代码 / 支持主流 UI 组件库生态能力与高保真并发调度
          </p>
        </div>

        <FpsMonitor />
      </header>

      {/* 流畅度检测条 */}
      <ContinuousSpinner />

      {/* 案例切换栏 */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveCase('library')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeCase === 'library'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          主流 UI 组件库核心生态能力 (Context / Ref / Portal / Children)
        </button>
        <button
          onClick={() => setActiveCase('interleaving')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeCase === 'interleaving'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          React 18 并发调度与时间切片 (Time Slicing & Bailout)
        </button>
      </div>

      {/* 渲染当前案例 */}
      {activeCase === 'library' ? <CaseComponentLibrary /> : <CaseInterleaving />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
