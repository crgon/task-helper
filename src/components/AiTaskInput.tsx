import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { NewTask } from "../types";

interface ParsedTask {
  title: string;
  category: string;
  due_at: string | null;
  priority: number;
  note: string | null;
}

interface Props {
  onAdded: () => void;
}

export default function AiTaskInput({ onAdded }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedTask | null>(null);
  const [error, setError] = useState("");

  async function handleParse() {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const raw = await invoke<string>("parse_nl_task", { input: input.trim() });
      // 去掉可能的 markdown 代码块
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed: ParsedTask = JSON.parse(clean);
      setPreview(parsed);
    } catch (e: any) {
      setError(e?.toString() || "解析失败，请检查 API Key 或网络");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setLoading(true);
    try {
      const task: NewTask = {
        title: preview.title,
        category: preview.category,
        due_at: preview.due_at ?? undefined,
        priority: preview.priority,
        note: preview.note ?? undefined,
      };
      await invoke("add_task", { task });
      setInput("");
      setPreview(null);
      onAdded();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const PRIORITY_LABEL: Record<number, string> = { 1: "紧急", 2: "普通", 3: "低" };
  const PRIORITY_COLOR: Record<number, string> = {
    1: "bg-red-50 text-red-600",
    2: "bg-yellow-50 text-yellow-700",
    3: "bg-green-50 text-green-700",
  };

  return (
    <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
      {/* 输入区 */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm">✦</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && handleParse()}
            placeholder="用自然语言描述任务，如：下周五交数据库作业"
            className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-blue-200
                       focus:outline-none focus:border-blue-400 text-sm bg-blue-50/30"
          />
        </div>
        <button
          onClick={handleParse}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm
                     hover:bg-blue-600 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {loading ? "解析中…" : "AI解析"}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* 解析结果预览 */}
      {preview && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">解析结果预览</p>

          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-800">{preview.title}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_COLOR[preview.priority]}`}>
              {PRIORITY_LABEL[preview.priority]}
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-xs text-gray-500">
              {preview.category}
            </span>
            {preview.due_at && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs">
                📅 {new Date(preview.due_at).toLocaleString("zh-CN", {
                  month: "numeric", day: "numeric",
                  hour: "2-digit", minute: "2-digit"
                })}
              </span>
            )}
          </div>

          {preview.note && (
            <p className="text-xs text-gray-500">{preview.note}</p>
          )}

          {/* 确认/修改按钮 */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setPreview(null)}
              className="flex-1 py-1.5 text-xs text-gray-500 border border-gray-200
                         rounded-lg hover:bg-gray-100 transition-colors"
            >
              重新解析
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-1.5 text-xs text-white bg-blue-500
                         rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              {loading ? "保存中…" : "确认加入"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}