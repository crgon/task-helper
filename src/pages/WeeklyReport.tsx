import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Task } from "../types";
import { urgencyColor, daysLeft, formatDate } from "../types";

interface TaskSummaryForReport {
  title: string;
  due_at: string | null;
  category: string;
}

export default function WeeklyReport() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [report, setReport] = useState("");
  const [generating, setGenerating] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    invoke<Task[]>("get_tasks").then(setTasks);
    invoke<boolean>("get_api_key_status").then(setHasKey);
  }, []);

  async function generateReport() {
    setGenerating(true);
    setReport("");
    try {
      const pending = tasks.filter(t => !t.completed_at);
      const summaries: TaskSummaryForReport[] = pending.map(t => ({
        title: t.title,
        due_at: t.due_at,
        category: t.category,
      }));
      const result = await invoke<string>("generate_full_report", {
        tasksJson: JSON.stringify(summaries),
      });
      setReport(result);
    } catch (e: any) {
      setReport("生成失败：" + (e?.toString() || "请检查 API Key 和网络"));
    } finally {
      setGenerating(false);
    }
  }

  const pending = tasks.filter(t => !t.completed_at);
  const done = tasks.filter(t => !!t.completed_at);
  const overdue = pending.filter(t => t.due_at && new Date(t.due_at) < new Date());
  const thisWeek = pending.filter(t => {
    if (!t.due_at) return false;
    const d = (new Date(t.due_at).getTime() - Date.now()) / 86400000;
    return d >= 0 && d <= 7;
  });

  const byCategory: Record<string, number> = {};
  for (const t of pending) {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  }

  const sorted = [...pending].sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-100 px-5 pt-5 pb-4 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-800">任务周报</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date().toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </p>
      </header>

      <main className="px-4 py-5 space-y-5 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "待完成", value: pending.length, sub: "项任务", bg: "bg-blue-50", text: "text-blue-600" },
            { label: "已完成", value: done.length, sub: "项任务", bg: "bg-green-50", text: "text-green-600" },
            { label: "已逾期", value: overdue.length, sub: "需处理", bg: "bg-red-50", text: "text-red-500" },
            { label: "本周到期", value: thisWeek.length, sub: "项紧急", bg: "bg-orange-50", text: "text-orange-500" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 animate-fade-in-up`}>
              <p className={`text-2xl font-semibold ${s.text}`}>{s.value}</p>
              <p className={`text-xs mt-1 ${s.text} opacity-80`}>
                {s.label} · {s.sub}
              </p>
            </div>
          ))}
        </div>

        {Object.keys(byCategory).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">分类分布</h2>
            <div className="space-y-2">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => {
                  const pct = Math.round((count / pending.length) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{cat}</span>
                        <span className="text-gray-400">
                          {count} 项 · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI 周报</h2>
            <button
              onClick={generateReport}
              disabled={generating || !hasKey || pending.length === 0}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-xl text-xs hover:bg-blue-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {generating ? (
                <>
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v2M6 9v2M1 6h2M9 6h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  生成中…
                </>
              ) : (
                <>✦ 生成周报</>
              )}
            </button>
          </div>

          {!hasKey && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
              请先在设置中填写 DeepSeek API Key，才能使用 AI 周报功能。
            </p>
          )}

          {report ? (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">{report}</p>
            </div>
          ) : (
            !generating && hasKey && <p className="text-xs text-gray-400 text-center py-4">点击上方按钮，生成本周任务总结与建议</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">全部待完成任务 · {pending.length} 项</h2>

          {sorted.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">所有任务已完成，太棒了！</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((task, i) => {
                const color = urgencyColor(task.due_at, false);
                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border border-gray-50 hover:border-gray-100 transition-colors animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${color.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400">{task.category}</span>
                        {task.due_at && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs font-medium text-gray-600">{daysLeft(task.due_at)}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{formatDate(task.due_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {task.priority === 1 && <span className="text-xs text-red-400 flex-shrink-0">紧急</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
