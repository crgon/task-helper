import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { NewTask } from "../types";

interface Props {
  onAdded: () => void;
}

const CATEGORIES = ["课程", "社团", "科研", "生活", "其他"];

export default function AddTaskForm({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("课程");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState(2);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await invoke("add_task", {
        task: {
          title: title.trim(),
          category,
          due_at: dueAt || undefined,
          priority,
          note: note.trim() || undefined,
        } as NewTask,
      });
      setTitle("");
      setDueAt("");
      setNote("");
      setPriority(2);
      setOpen(false);
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-2xl border border-dashed border-gray-200
                 text-gray-400 hover:border-blue-300 hover:text-blue-400
                 transition-all text-sm flex items-center justify-center gap-2
                 hover:bg-blue-50/50"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        添加新任务
      </button>
    );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 animate-scale-in">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        placeholder="任务标题"
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50
                   focus:outline-none focus:border-blue-400 focus:bg-white
                   text-sm transition-colors"
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50
                     focus:outline-none focus:border-blue-400 text-sm"
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>

        <select
          value={priority}
          onChange={e => setPriority(Number(e.target.value))}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50
                     focus:outline-none focus:border-blue-400 text-sm"
        >
          <option value={1}>🔴 紧急</option>
          <option value={2}>🟡 普通</option>
          <option value={3}>🟢 低</option>
        </select>
      </div>

      <input
        type="datetime-local"
        value={dueAt}
        onChange={e => setDueAt(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50
                   focus:outline-none focus:border-blue-400 text-sm"
      />

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="备注（可选）"
        rows={2}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50
                   focus:outline-none focus:border-blue-400 text-sm resize-none"
      />

      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 rounded-xl
                     hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || loading}
          className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-sm
                     hover:bg-blue-600 disabled:opacity-40 transition-colors
                     active:scale-95"
        >
          {loading ? "保存中…" : "保存任务"}
        </button>
      </div>
    </div>
  );
}