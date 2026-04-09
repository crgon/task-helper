import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Task } from "../types";

interface Subtask {
  id?: number;
  title: string;
  suggested_due_at: string | null;
  estimate_hours: number | null;
  note: string | null;
  completed_at?: string | null;
}

interface Props {
  task: Task;
  onClose: () => void;
  onRefresh: () => void;
}

export default function BreakdownPanel({ task, onClose, onRefresh }: Props) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 加载已有子任务
  useEffect(() => {
    invoke<any[]>("get_subtasks", { taskId: task.id }).then(rows => {
      if (rows.length > 0) {
        setSaved(true);
        setSubtasks(rows.map(r => ({
          id: r.id,
          title: r.title,
          suggested_due_at: r.suggested_due_at,
          estimate_hours: r.estimate_hours,
          note: r.note,
          completed_at: r.completed_at,
        })));
      }
    });
  }, [task.id]);

  async function handleBreakdown() {
    setLoading(true);
    try {
      const raw = await invoke<string>("ai_breakdown_task", {
        taskTitle: task.title,
        taskDue: task.due_at ?? null,
        conversation: "",
      });
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed: Subtask[] = JSON.parse(clean);
      setSubtasks(parsed);
      setSaved(false);
    } catch (e: any) {
      alert("拆解失败：" + (e?.toString() || "未知错误"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (subtasks.length === 0) return;
    setSaving(true);
    try {
      const newSubtasks = subtasks
        .filter(s => !s.id) // 只保存没有 id 的（新生成的）
        .map(s => ({
          task_id: task.id,
          title: s.title,
          suggested_due_at: s.suggested_due_at,
          estimate_hours: s.estimate_hours,
          note: s.note,
        }));

      if (newSubtasks.length > 0) {
        await invoke("add_subtasks", { subtasks: newSubtasks });
      }
      // 重新加载
      const rows = await invoke<any[]>("get_subtasks", { taskId: task.id });
      setSubtasks(rows.map(r => ({
        id: r.id,
        title: r.title,
        suggested_due_at: r.suggested_due_at,
        estimate_hours: r.estimate_hours,
        note: r.note,
        completed_at: r.completed_at,
      })));
      setSaved(true);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleCompleteSubtask(id: number) {
    await invoke("complete_subtask", { id });
    const rows = await invoke<any[]>("get_subtasks", { taskId: task.id });
    setSubtasks(rows.map(r => ({
      id: r.id,
      title: r.title,
      suggested_due_at: r.suggested_due_at,
      estimate_hours: r.estimate_hours,
      note: r.note,
      completed_at: r.completed_at,
    })));
  }

  const completedCount = subtasks.filter(s => s.completed_at).length;
  const progress = subtasks.length > 0
    ? Math.round((completedCount / subtasks.length) * 100)
    : 0;

  return (
    // 半透明遮罩
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 面板本体（从底部滑入风格）*/}
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 pb-8
                      max-h-[80vh] overflow-y-auto">

        {/* 顶部 */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">任务拆解</p>
            <h2 className="text-base font-semibold text-gray-800 leading-snug">
              {task.title}
            </h2>
            {task.due_at && (
              <p className="text-xs text-gray-400 mt-0.5">
                截止：{new Date(task.due_at).toLocaleString("zh-CN", {
                  month: "numeric", day: "numeric",
                  hour: "2-digit", minute: "2-digit"
                })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 text-lg p-1"
          >✕</button>
        </div>

        {/* 进度条（有子任务时显示）*/}
        {subtasks.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>完成进度</span>
              <span>{completedCount}/{subtasks.length} · {progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 子任务列表 */}
        {subtasks.length > 0 ? (
          <div className="space-y-2 mb-4">
            {subtasks.map((s, idx) => (
              <div
                key={s.id ?? idx}
                className={`flex items-start gap-3 p-3 rounded-lg border
                  ${s.completed_at
                    ? "bg-gray-50 border-gray-100 opacity-50"
                    : "bg-white border-gray-100 hover:border-gray-200"
                  }`}
              >
                {/* 勾选（只有已保存的才能勾选）*/}
                {s.id ? (
                  <button
                    onClick={() => !s.completed_at && handleCompleteSubtask(s.id!)}
                    disabled={!!s.completed_at}
                    className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0
                      flex items-center justify-center transition-colors
                      ${s.completed_at
                        ? "bg-blue-400 border-blue-400"
                        : "border-gray-300 hover:border-blue-400"
                      }`}
                  >
                    {s.completed_at && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor"
                              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ) : (
                  <div className="mt-0.5 w-4 h-4 rounded border border-dashed
                                  border-gray-300 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug
                    ${s.completed_at ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {s.title}
                  </p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {s.suggested_due_at && (
                      <span className="text-xs text-gray-400">
                        📅 {new Date(s.suggested_due_at).toLocaleDateString("zh-CN", {
                          month: "numeric", day: "numeric"
                        })}
                      </span>
                    )}
                    {s.estimate_hours && (
                      <span className="text-xs text-gray-400">
                        ⏱ 约 {s.estimate_hours}h
                      </span>
                    )}
                  </div>
                  {s.note && (
                    <p className="text-xs text-gray-400 mt-0.5">{s.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            点击下方按钮，让 AI 帮你拆解这个任务
          </div>
        )}

        {/* 底部按钮区 */}
        <div className="flex gap-2">
          <button
            onClick={handleBreakdown}
            disabled={loading}
            className="flex-1 py-2.5 border border-blue-200 text-blue-500 rounded-xl
                       text-sm hover:bg-blue-50 disabled:opacity-40 transition-colors"
          >
            {loading ? "AI拆解中…" : subtasks.length > 0 ? "重新拆解" : "✦ AI智能拆解"}
          </button>

          {subtasks.length > 0 && !saved && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl
                         text-sm hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              {saving ? "保存中…" : "保存子任务"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}