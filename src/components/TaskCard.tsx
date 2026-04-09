import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import type { Task } from "../types";
import { urgencyColor, daysLeft, formatDate } from "../types";

interface Props {
  task: Task;
  onRefresh: () => void;
  onBreakdown: () => void;
  index?: number;
}

export default function TaskCard({ task, onRefresh, onBreakdown, index = 0 }: Props) {
  const navigate = useNavigate();
  const done = !!task.completed_at;
  const color = urgencyColor(task.due_at, done);
  const delay = `stagger-${Math.min(index + 1, 5)}`;

  async function handleComplete() {
    if (done) return;
    await invoke("complete_task", { id: task.id });
    onRefresh();
  }

  async function handleDelete() {
    await invoke("delete_task", { id: task.id });
    onRefresh();
  }

  return (
    <div onClick={() => navigate(`/task/${task.id}`)} className={`
      group bg-white rounded-2xl border border-gray-100 cursor-pointer
      border-l-4 ${color.border}
      p-4 flex items-start gap-3
      transition-all duration-200
      hover:border-gray-200 hover:shadow-sm
      animate-fade-in-up ${delay}
      ${done ? "opacity-50" : ""}
    `}>
      <button
        onClick={e => {
          e.stopPropagation();
          handleComplete();
        }}
        disabled={done}
        className={`
          mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0
          flex items-center justify-center
          transition-all duration-150
          ${done
            ? "border-gray-300 bg-gray-200 cursor-default"
            : "border-gray-300 hover:border-blue-400 hover:scale-110 active:scale-95"
          }
        `}
      >
        {done && (
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 12 12">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
            {task.title}
          </p>

          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {!done && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onBreakdown();
                }}
                title="AI 拆解"
                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                  <rect x="1" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="8" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="1" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M10.5 8v5M8 10.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                handleDelete();
              }}
              title="删除"
              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
            {task.category}
          </span>

          {task.due_at && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color.badge}`}>
              {done ? formatDate(task.due_at) : daysLeft(task.due_at)}
            </span>
          )}

          {task.priority === 1 && !done && (
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
              紧急
            </span>
          )}
        </div>

        {task.note && (
          <p className="mt-1.5 text-xs text-gray-400 leading-relaxed line-clamp-2">
            {task.note}
          </p>
        )}
      </div>
    </div>
  );
}