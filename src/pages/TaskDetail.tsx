import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import type { Task } from "../types";
import { urgencyColor, daysLeft, formatDate } from "../types";
import BreakdownPanel from "../components/BreakdownPanel";
import AttachmentSection from "../components/AttachmentSection";

interface Subtask {
  id: number;
  task_id: number;
  title: string;
  suggested_due_at: string | null;
  estimate_hours: number | null;
  note: string | null;
  completed_at: string | null;
}

interface TaskLog {
  id: number;
  task_id: number;
  content: string;
  log_type: string;
  created_at: string;
}

const LOG_TYPE_CONFIG = {
  note: { label: "笔记", bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400" },
  progress: { label: "进展", bg: "bg-green-50", text: "text-green-600", dot: "bg-green-400" },
  issue: { label: "问题", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const taskId = Number(id);

  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const [logContent, setLogContent] = useState("");
  const [logType, setLogType] = useState<"note" | "progress" | "issue">("note");
  const [logLoading, setLogLoading] = useState(false);

  const loadAll = useCallback(async () => {
    const [t, st, lg] = await Promise.all([
      invoke<Task | null>("get_task_by_id", { id: taskId }),
      invoke<Subtask[]>("get_subtasks", { taskId }),
      invoke<TaskLog[]>("get_task_logs", { taskId }),
    ]);
    setTask(t);
    setSubtasks(st);
    setLogs(lg);
  }, [taskId]);

  useEffect(() => {
    if (!Number.isFinite(taskId)) return;
    loadAll();
  }, [loadAll, taskId]);

  async function handleCompleteTask() {
    if (!task || task.completed_at) return;
    await invoke("complete_task", { id: taskId });
    loadAll();
  }

  async function handleCompleteSubtask(sid: number) {
    await invoke("complete_subtask", { id: sid });
    loadAll();
  }

  async function handleAddLog() {
    if (!logContent.trim()) return;
    setLogLoading(true);
    try {
      await invoke("add_task_log", {
        log: { task_id: taskId, content: logContent.trim(), log_type: logType },
      });
      setLogContent("");
      loadAll();
    } finally {
      setLogLoading(false);
    }
  }

  async function handleDeleteLog(lid: number) {
    await invoke("delete_task_log", { id: lid });
    loadAll();
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">加载中…</div>
      </div>
    );
  }

  const done = !!task.completed_at;
  const color = urgencyColor(task.due_at, done);
  const completedSub = subtasks.filter(s => s.completed_at).length;
  const progress = subtasks.length > 0 ? Math.round((completedSub / subtasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">{task.category}</p>
            <h1 className={`text-base font-semibold leading-snug truncate ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
              {task.title}
            </h1>
          </div>
          {!done && (
            <button
              onClick={handleCompleteTask}
              className="px-3 py-1.5 rounded-xl bg-green-50 text-green-600 text-xs font-medium hover:bg-green-100 transition-colors"
            >
              完成任务
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className={`bg-white rounded-2xl border-l-4 ${color.border} border border-gray-100 p-4 animate-fade-in-up`}>
          <div className="flex items-center gap-2 flex-wrap">
            {task.due_at && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color.badge}`}>
                {done ? "已完成" : daysLeft(task.due_at)}
              </span>
            )}
            {task.priority === 1 && (
              <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-500 text-xs font-medium">紧急</span>
            )}
            {done && <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs">已完成</span>}
          </div>

          {task.due_at && (
            <div className="flex items-center gap-2 mt-3">
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="text-gray-400">
                <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <path d="M5 1v2M9 1v2M2 6h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="text-xs text-gray-500">{formatDate(task.due_at)}</span>
            </div>
          )}

          {task.note && <p className="mt-3 text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">{task.note}</p>}

          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
            <span>创建于 {formatDate(task.created_at)}</span>
            {task.completed_at && (
              <>
                <span>·</span>
                <span>完成于 {formatDate(task.completed_at)}</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-fade-in-up stagger-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700">子任务</h2>
              {subtasks.length > 0 && <span className="text-xs text-gray-400">{completedSub}/{subtasks.length}</span>}
            </div>
            {!done && (
              <button
                onClick={() => setShowBreakdown(true)}
                className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-500 text-xs hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                  <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                AI 拆解
              </button>
            )}
          </div>

          {subtasks.length > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>完成进度</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {subtasks.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-4">暂无子任务，点击 AI 拆解自动生成</p>
          ) : (
            <div className="space-y-2">
              {subtasks.map(s => (
                <SubtaskItem key={s.id} subtask={s} onComplete={handleCompleteSubtask} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-fade-in-up stagger-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">过程记录</h2>

          <div className="space-y-2 mb-4">
            <textarea
              value={logContent}
              onChange={e => setLogContent(e.target.value)}
              placeholder="记录进展、笔记或遇到的问题…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white text-sm resize-none transition-colors"
            />
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {(Object.entries(LOG_TYPE_CONFIG) as [string, typeof LOG_TYPE_CONFIG[keyof typeof LOG_TYPE_CONFIG]][]).map(([type, cfg]) => (
                  <button
                    key={type}
                    onClick={() => setLogType(type as "note" | "progress" | "issue")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      logType === type ? `${cfg.bg} ${cfg.text}` : "text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddLog}
                disabled={!logContent.trim() || logLoading}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-xl text-xs hover:bg-blue-600 disabled:opacity-40 transition-colors"
              >
                {logLoading ? "…" : "添加"}
              </button>
            </div>
          </div>

          {logs.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-3">暂无记录，添加第一条吧</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => {
                const cfg = LOG_TYPE_CONFIG[log.log_type as keyof typeof LOG_TYPE_CONFIG] || LOG_TYPE_CONFIG.note;
                return (
                  <div key={log.id} className={`rounded-xl p-3 ${cfg.bg} group relative animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium mb-0.5 ${cfg.text}`}>{cfg.label}</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{log.content}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(log.created_at)}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-50 flex-shrink-0"
                      >
                        <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
                          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <AttachmentSection taskId={taskId} />
      </main>

      {showBreakdown && <BreakdownPanel task={task} onClose={() => setShowBreakdown(false)} onRefresh={loadAll} />}
    </div>
  );
}

function SubtaskItem({ subtask: s, onComplete }: { subtask: Subtask; onComplete: (id: number) => void }) {
  const done = !!s.completed_at;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${done ? "border-gray-100 bg-gray-50 opacity-60" : "border-gray-100 hover:border-gray-200 bg-white"}`}>
      <button
        onClick={() => !done && onComplete(s.id)}
        disabled={done}
        className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${done ? "bg-blue-400 border-blue-400" : "border-gray-300 hover:border-blue-400"}`}
      >
        {done && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${done ? "line-through text-gray-400" : "text-gray-700"}`}>{s.title}</p>
        <div className="flex gap-2 mt-1 flex-wrap">
          {s.suggested_due_at && (
            <span className="text-xs text-gray-400">
              {new Date(s.suggested_due_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
            </span>
          )}
          {s.estimate_hours && <span className="text-xs text-gray-400">约 {s.estimate_hours}h</span>}
          {s.completed_at && <span className="text-xs text-gray-400">完成于 {formatDate(s.completed_at)}</span>}
        </div>
        {s.note && <p className="text-xs text-gray-400 mt-0.5">{s.note}</p>}
      </div>
    </div>
  );
}
