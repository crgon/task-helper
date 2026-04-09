import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Task } from "../types";
import TaskCard from "../components/TaskCard";
import AddTaskForm from "../components/AddTaskForm";
import AiTaskInput from "../components/AiTaskInput";
import BreakdownPanel from "../components/BreakdownPanel";
import SettingsModal from "../components/SettingsModal";

type Filter = "all" | "today" | "week" | "done";
type InputMode = "manual" | "ai";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [breakdownTask, setBreakdownTask] = useState<Task | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const loadTasks = useCallback(async () => {
    const result = await invoke<Task[]>("get_tasks");
    setTasks(result);
  }, []);

  const checkApiKey = useCallback(async () => {
    const status = await invoke<boolean>("get_api_key_status");
    setHasApiKey(status);
  }, []);

  useEffect(() => {
    loadTasks();
    checkApiKey();
  }, []);

  useEffect(() => {
    if (tasks.length === 0) return;
    const pending = tasks.filter(t => !t.completed_at);
    const summaries = pending.map(t => ({
      title: t.title,
      due_at: t.due_at,
      category: t.category,
    }));
    invoke("check_weekly_report", { tasksJson: JSON.stringify(summaries) }).catch(() => {});
  }, [tasks]);

  const filtered = tasks.filter(t => {
    const done = !!t.completed_at;
    if (filter === "done") return done;
    if (done) return false;
    if (filter === "today") {
      if (!t.due_at) return false;
      return (new Date(t.due_at).getTime() - Date.now()) / 86400000 <= 1;
    }
    if (filter === "week") {
      if (!t.due_at) return false;
      const d = (new Date(t.due_at).getTime() - Date.now()) / 86400000;
      return d >= 0 && d <= 7;
    }
    return true;
  });

  const pendingCount = tasks.filter(t => !t.completed_at).length;
  const urgentCount = tasks.filter(t => {
    if (t.completed_at || !t.due_at) return false;
    return (new Date(t.due_at).getTime() - Date.now()) / 86400000 <= 1;
  }).length;

  const TABS: { key: Filter; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "today", label: "今日" },
    { key: "week", label: "本周" },
    { key: "done", label: "已完成" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-100 px-5 pt-5 pb-4 sticky top-0 z-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-800">任务助手</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {pendingCount} 项待完成
              {urgentCount > 0 && <span className="ml-1.5 text-red-400">· {urgentCount} 项今日到期</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString("zh-CN", {
                month: "numeric",
                day: "numeric",
                weekday: "short",
              })}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                <path
                  d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14 M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1 M3.5 12.5l1.1-1.1M11.4 4.6l1.1-1.1"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mt-3">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {filter !== "done" && (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              {[
                { mode: "manual" as InputMode, label: "手动输入" },
                { mode: "ai" as InputMode, label: "✦ AI 输入" },
              ].map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => {
                    if (mode === "ai" && !hasApiKey) {
                      setShowSettings(true);
                      return;
                    }
                    setInputMode(mode);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    inputMode === mode
                      ? mode === "ai"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {label}
                  {mode === "ai" && !hasApiKey && <span className="ml-1 opacity-60 text-xs">·需设置</span>}
                </button>
              ))}
            </div>

            {inputMode === "manual" ? <AddTaskForm onAdded={loadTasks} /> : <AiTaskInput onAdded={loadTasks} />}
          </div>
        )}

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm animate-fade-in-up">
              {filter === "done" ? "还没有完成的任务" : "暂无任务 ✨"}
            </div>
          ) : (
            filtered.map((task, i) => (
              <TaskCard
                key={task.id}
                task={task}
                onRefresh={loadTasks}
                onBreakdown={() => setBreakdownTask(task)}
                index={i}
              />
            ))
          )}
        </div>
      </main>

      {breakdownTask && (
        <BreakdownPanel task={breakdownTask} onClose={() => setBreakdownTask(null)} onRefresh={loadTasks} />
      )}

      {showSettings && <SettingsModal onClose={() => { setShowSettings(false); checkApiKey(); }} />}
    </div>
  );
}
