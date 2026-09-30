import React, { useState, useTransition, useMemo } from 'react';

// 模拟轻微 CPU 密集型任务
function simulateWork(ms: number) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    // 忙等待模拟纯 CPU 计算
  }
}

function MetricCard({ id }: { id: number }) {
  // 每个指标卡片模拟 2.5ms 的 CPU 计算，80 个节点约 200ms
  simulateWork(2.5);

  return (
    <div className="px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg flex flex-col gap-1 hover:border-sky-400/40 hover:bg-white/[0.06] transition-all duration-200">
      <div className="text-xs text-sky-400 font-semibold">指标 #{id}</div>
      <div className="text-[11px] text-slate-400">
        实时负载: +{((id * 43) % 100)}%
      </div>
    </div>
  );
}

export function CaseInterleaving() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [reportCount, setReportCount] = useState(8);
  const [isPending, startTransition] = useTransition();
  const [logs, setLogs] = useState<string[]>([]);
  const [clickCount, setClickCount] = useState(0);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 10)]);
  };

  console.log('isPending', isPending, reportCount);

  const handleComputeHeavyReport = () => {
    addLog('🚀 触发大型报表更新 (分配 TransitionLane, 耗时 ~200ms)...');
    startTransition(() => {
      setReportCount((c) => (c === 8 ? 80 : 8));
    });
  };

  const handleToggleSidebar = () => {
    const start = performance.now();
    setSidebarOpen((prev) => !prev);
    const duration = Math.round(performance.now() - start);
    addLog(`⚡ 侧边栏高优先级插队响应 (SyncLane, 耗时: ${duration}ms)`);
  };

  const handleQuickClick = () => {
    setClickCount((c) => c + 1);
    addLog(`🔥 紧急计数按钮点击 #${clickCount + 1} (SyncLane 立即响应)`);
  };

  const items = useMemo(() => {
    return Array.from({ length: reportCount }, (_, i) => i + 1);
  }, [reportCount]);

  return (
    <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-100">
          <span>📊 案例：并发时间切片与优先级插队 (useTransition vs SyncLane)</span>
          <span className="text-[11px] bg-sky-500/15 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-medium">
            31位 Lane 模型内核验证
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          点击【计算重载报表】将任务放入 <code className="text-slate-200 bg-white/5 px-1 py-0.5 rounded font-mono text-[11px]">TransitionLane</code> 后台切片计算；在此期间点击【折叠侧边栏】或【快速点击】，
          属于最高优先级 <code className="text-slate-200 bg-white/5 px-1 py-0.5 rounded font-mono text-[11px]">SyncLane</code>，<strong className="text-slate-200 font-semibold">React 立即暂停报表渲染，优先响应用户点击，实现 0 延迟响应</strong>！
        </p>
      </div>

      {/* 控制操作栏 */}
      <div className="flex gap-3 flex-wrap items-center">
        <button
          onClick={handleComputeHeavyReport}
          className="bg-gradient-to-r from-sky-500 to-sky-400 text-slate-950 px-4.5 py-2.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          {isPending ? '⏳ 渲染计算中 (Transition Pending)...' : '📈 切换 80 项重型报表 (~200ms CPU)'}
        </button>

        <button
          onClick={handleToggleSidebar}
          className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-slate-200 px-4 py-2.5 rounded-lg font-semibold text-xs transition-all active:scale-95 cursor-pointer"
        >
          📂 {isSidebarOpen ? '折叠侧边栏 (SyncLane)' : '展开侧边栏 (SyncLane)'}
        </button>

        <button
          onClick={handleQuickClick}
          className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-lg font-semibold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          ⚡ 狂点打断测试 (已点击: {clickCount})
        </button>
      </div>

      {/* 侧边栏与报表双栏布局 */}
      <div className="flex gap-4 min-h-[260px]">
        <div
          className={`transition-[width] duration-300 ease-out bg-black/25 border border-white/10 rounded-xl p-3.5 overflow-hidden flex flex-col gap-2.5 shrink-0 ${isSidebarOpen ? 'w-44' : 'w-14'
            }`}
        >
          <div className="font-bold text-xs text-indigo-400 whitespace-nowrap">
            {isSidebarOpen ? '📁 导航菜单' : '📁'}
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col gap-2 text-xs text-slate-400">
              <div>• 实时控制台</div>
              <div>• 并发监控</div>
              <div>• Lane 位掩码查看</div>
              <div>• Fiber 树状态</div>
            </div>
          )}
        </div>

        {/* 报表卡片容器 */}
        <div className="flex-1 bg-black/25 border border-white/10 rounded-xl p-3.5 flex flex-col gap-3">
          <div className="text-xs text-slate-400 flex justify-between items-center">
            <span>当前报表项数量: <strong className="text-slate-200 font-semibold">{reportCount} 个 Fiber 节点</strong></span>
            {isPending && <span className="text-amber-400 font-semibold flex items-center gap-1">● Transition 渲染切片进行中</span>}
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 max-h-[200px] overflow-y-auto pr-1.5">
            {items.map((id) => (
              <MetricCard key={id} id={id} />
            ))}
          </div>
        </div>
      </div>

      {/* 实时调度日志 */}
      <div className="bg-black/40 border border-white/5 rounded-lg p-3 font-mono text-[11px] max-h-32 overflow-y-auto">
        <div className="text-slate-500 mb-1">// 调度事件实时输出:</div>
        {logs.length === 0 ? (
          <div className="text-slate-600">等待交互...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`leading-relaxed ${log.includes('⚡') ? 'text-emerald-400' : 'text-slate-200'}`}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
