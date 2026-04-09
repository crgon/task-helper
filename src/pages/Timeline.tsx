import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import type { Task } from "../types";
import { urgencyColor, daysLeft, formatDate, timeGroup, GROUP_ORDER } from "../types";

type ViewMode = "list" | "visual";

const GROUP_COLORS: Record<
  string,
  {
    dot: string;
    line: string;
    pin: string;
    pinBg: string;
    label: string;
    text: string;
  }
> = {
  已逾期: { dot: "#ef4444", line: "#fca5a5", pin: "#ef4444", pinBg: "#fef2f2", label: "#dc2626", text: "#991b1b" },
  今天: { dot: "#f97316", line: "#fdba74", pin: "#f97316", pinBg: "#fff7ed", label: "#ea580c", text: "#9a3412" },
  本周: { dot: "#eab308", line: "#fde047", pin: "#eab308", pinBg: "#fefce8", label: "#ca8a04", text: "#854d0e" },
  本月: { dot: "#22c55e", line: "#86efac", pin: "#22c55e", pinBg: "#f0fdf4", label: "#16a34a", text: "#166534" },
  未来: { dot: "#3b82f6", line: "#93c5fd", pin: "#3b82f6", pinBg: "#eff6ff", label: "#2563eb", text: "#1e40af" },
  无截止时间: { dot: "#94a3b8", line: "#cbd5e1", pin: "#94a3b8", pinBg: "#f8fafc", label: "#64748b", text: "#475569" },
  已完成: { dot: "#6ee7b7", line: "#a7f3d0", pin: "#10b981", pinBg: "#ecfdf5", label: "#059669", text: "#065f46" },
};

export default function Timeline() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("visual");
  const navigate = useNavigate();

  useEffect(() => {
    invoke<Task[]>("get_tasks").then(setTasks);
  }, []);

  async function handleComplete(id: number) {
    await invoke("complete_task", { id });
    invoke<Task[]>("get_tasks").then(setTasks);
  }

  async function handleDelete(id: number) {
    await invoke("delete_task", { id });
    invoke<Task[]>("get_tasks").then(setTasks);
  }

  const visible = tasks.filter(t => (showDone ? true : !t.completed_at));

  const grouped: Record<string, Task[]> = {};
  for (const t of visible) {
    const g = t.completed_at ? "已完成" : timeGroup(t.due_at);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(t);
  }

  const orderedKeys = [...GROUP_ORDER.filter(k => grouped[k]), ...(grouped["已完成"] ? ["已完成"] : [])];

  const pendingCount = tasks.filter(t => !t.completed_at).length;
  const overdueCount = tasks.filter(t => !t.completed_at && !!t.due_at && new Date(t.due_at) < new Date()).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-100 px-5 pt-5 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-800">时间线</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {pendingCount} 项待完成
              {overdueCount > 0 && <span className="ml-2 text-red-400">· {overdueCount} 项逾期</span>}
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([
              ["visual", "精美视图"],
              ["list", "列表视图"],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === m ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            {
              label: "逾期",
              n: tasks.filter(t => !t.completed_at && !!t.due_at && new Date(t.due_at) < new Date()).length,
              cls: "text-red-500 bg-red-50",
            },
            {
              label: "今天",
              n: tasks.filter(t => {
                if (t.completed_at || !t.due_at) return false;
                const d = (new Date(t.due_at).getTime() - Date.now()) / 86400000;
                return d >= 0 && d <= 1;
              }).length,
              cls: "text-orange-500 bg-orange-50",
            },
            {
              label: "本周",
              n: tasks.filter(t => {
                if (t.completed_at || !t.due_at) return false;
                const d = (new Date(t.due_at).getTime() - Date.now()) / 86400000;
                return d > 1 && d <= 7;
              }).length,
              cls: "text-yellow-600 bg-yellow-50",
            },
            { label: "已完成", n: tasks.filter(t => !!t.completed_at).length, cls: "text-green-600 bg-green-50" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl px-2 py-2 text-center ${s.cls}`}>
              <p className="text-lg font-semibold leading-none">{s.n}</p>
              <p className="text-xs mt-1 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>

        <button onClick={() => setShowDone(!showDone)} className="mt-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5">
          <div className={`w-7 h-4 rounded-full transition-colors relative ${showDone ? "bg-blue-400" : "bg-gray-200"}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${showDone ? "translate-x-3.5" : "translate-x-0.5"}`} />
          </div>
          显示已完成任务
        </button>
      </header>

      <main className="py-5">
        {orderedKeys.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">暂无任务</div>
        ) : viewMode === "visual" ? (
          <VisualTimeline
            groups={grouped}
            orderedKeys={orderedKeys}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onNavigate={id => navigate(`/task/${id}`)}
          />
        ) : (
          <ListTimeline
            groups={grouped}
            orderedKeys={orderedKeys}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onNavigate={id => navigate(`/task/${id}`)}
          />
        )}
      </main>
    </div>
  );
}

function VisualTimeline({
  groups,
  orderedKeys,
  onComplete,
  onDelete,
  onNavigate,
}: {
  groups: Record<string, Task[]>;
  orderedKeys: string[];
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onNavigate: (id: number) => void;
}) {
  return (
    <div className="px-4 space-y-10">
      {orderedKeys.map((gk, gi) => {
        const gc = GROUP_COLORS[gk] || GROUP_COLORS["无截止时间"];
        const items = groups[gk] || [];
        return (
          <section key={gk} className={`animate-fade-in-up stagger-${Math.min(gi + 1, 5)}`}>
            <div className="flex items-center gap-2 mb-5 px-1">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: gc.dot }} />
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: gc.label }}>
                {gk}
              </span>
              <span className="text-xs text-gray-400">{items.length} 项</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="relative overflow-x-auto pb-2">
              <div className="min-w-max px-2">
                <div className="relative flex items-center" style={{ height: "8px", marginBottom: "0" }}>
                  <div className="absolute left-8 right-8 h-1.5 rounded-full" style={{ background: `linear-gradient(to right, ${gc.line}, ${gc.dot})` }} />
                </div>

                <div className="flex gap-0 relative" style={{ marginTop: "-4px" }}>
                  {items.map((task, ti) => (
                    <VisualNode
                      key={task.id}
                      task={task}
                      index={ti}
                      gc={gc}
                      onComplete={onComplete}
                      onDelete={onDelete}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function VisualNode({
  task,
  index,
  gc,
  onComplete,
  onDelete,
  onNavigate,
}: {
  task: Task;
  index: number;
  gc: (typeof GROUP_COLORS)[string];
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onNavigate: (id: number) => void;
}) {
  const done = !!task.completed_at;
  const showAbove = index % 2 === 0;

  return (
    <div
      className="flex flex-col items-center group cursor-pointer"
      style={{ width: "140px", minWidth: "140px" }}
      onClick={() => onNavigate(task.id)}
    >
      <div
        style={{
          height: "100px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: showAbove ? "flex-end" : "flex-start",
          paddingBottom: showAbove ? "8px" : "0",
          paddingTop: !showAbove ? "8px" : "0",
        }}
      >
        {showAbove && <NodeCard task={task} gc={gc} done={done} onComplete={onComplete} onDelete={onDelete} />}
      </div>

      <div className="relative flex items-center justify-center" style={{ height: "20px", zIndex: 10 }}>
        <div
          className="absolute w-0.5 rounded-full"
          style={{
            height: "12px",
            background: gc.dot,
            top: showAbove ? undefined : "8px",
            bottom: showAbove ? "8px" : undefined,
          }}
        />
        <div
          className="w-4 h-4 rounded-full border-2 border-white z-10 flex-shrink-0 transition-transform group-hover:scale-125"
          style={{
            background: done ? "#d1d5db" : gc.dot,
            boxShadow: `0 0 0 2px ${done ? "#d1d5db" : gc.dot}40`,
          }}
        />
      </div>

      <div style={{ height: "32px", display: "flex", alignItems: "flex-start", paddingTop: "6px" }}>
        {task.due_at ? (
          <span className="text-xs font-semibold" style={{ color: done ? "#9ca3af" : gc.label }}>
            {new Date(task.due_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
          </span>
        ) : (
          <span className="text-xs text-gray-400">无截止</span>
        )}
      </div>

      <div
        style={{
          height: "100px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: !showAbove ? "flex-start" : "flex-end",
          paddingTop: !showAbove ? "0" : "0",
        }}
      >
        {!showAbove && <NodeCard task={task} gc={gc} done={done} onComplete={onComplete} onDelete={onDelete} />}
      </div>
    </div>
  );
}

function NodeCard({
  task,
  gc,
  done,
  onComplete,
  onDelete,
}: {
  task: Task;
  gc: (typeof GROUP_COLORS)[string];
  done: boolean;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      className="mx-1 rounded-xl border p-2.5 text-left transition-all hover:shadow-sm group-hover:border-opacity-60"
      style={{ background: done ? "#f9fafb" : gc.pinBg, borderColor: done ? "#e5e7eb" : `${gc.dot}40` }}
      onClick={e => e.stopPropagation()}
    >
      <p className={`text-xs font-medium leading-snug line-clamp-2 ${done ? "line-through text-gray-400" : ""}`} style={{ color: done ? undefined : gc.text }}>
        {task.title}
      </p>
      <div className="flex items-center gap-1 mt-1.5">
        <span className="text-xs rounded-full px-1.5 py-0.5" style={{ background: done ? "#f3f4f6" : `${gc.dot}20`, color: done ? "#9ca3af" : gc.label, fontSize: "10px" }}>
          {task.category}
        </span>
        {task.due_at && !done && (
          <span className="text-xs" style={{ color: gc.label, fontSize: "10px" }}>
            {daysLeft(task.due_at)}
          </span>
        )}
      </div>
      <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!done && (
          <button
            onClick={e => {
              e.stopPropagation();
              onComplete(task.id);
            }}
            className="text-xs px-1.5 py-0.5 rounded-lg transition-colors hover:bg-green-100"
            style={{ color: gc.dot, fontSize: "10px" }}
          >
            完成
          </button>
        )}
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="text-xs px-1.5 py-0.5 rounded-lg hover:bg-red-50 text-red-300"
          style={{ fontSize: "10px" }}
        >
          删除
        </button>
      </div>
    </div>
  );
}

function ListTimeline({
  groups,
  orderedKeys,
  onComplete,
  onDelete,
  onNavigate,
}: {
  groups: Record<string, Task[]>;
  orderedKeys: string[];
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onNavigate: (id: number) => void;
}) {
  return (
    <div className="px-5 space-y-8">
      {orderedKeys.map((groupKey, gi) => {
        const gc = GROUP_COLORS[groupKey] || GROUP_COLORS["无截止时间"];
        return (
          <section key={groupKey} className={`animate-fade-in-up stagger-${Math.min(gi + 1, 5)}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: gc.dot }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: gc.label }}>
                {groupKey}
              </h2>
              <span className="text-xs text-gray-400">{groups[groupKey].length} 项</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="relative">
              <div className="absolute left-[18px] top-3 bottom-3 w-px bg-gray-100" />
              <div className="space-y-3">
                {groups[groupKey].map((task, ti) => {
                  const done = !!task.completed_at;
                  const color = urgencyColor(task.due_at, done);
                  return (
                    <div key={task.id} className={`flex gap-3 animate-fade-in-up stagger-${Math.min(ti + 1, 5)}`}>
                      <div className="flex flex-col items-center flex-shrink-0 w-9">
                        <div className="w-4 h-4 rounded-full border-2 border-white flex-shrink-0 mt-3 z-10" style={{ background: done ? "#d1d5db" : gc.dot }} />
                      </div>
                      <div
                        className={`flex-1 bg-white rounded-2xl border border-gray-100 p-3.5 group transition-all hover:border-gray-200 cursor-pointer ${done ? "opacity-50" : ""}`}
                        onClick={() => onNavigate(task.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-snug ${done ? "line-through text-gray-400" : "text-gray-800"}`}>{task.title}</p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {!done && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  onComplete(task.id);
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-green-500 hover:bg-green-50"
                              >
                                <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onDelete(task.id);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50"
                            >
                              <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
                                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">{task.category}</span>
                          {task.due_at && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color.badge}`}>
                              {done ? formatDate(task.due_at) : daysLeft(task.due_at)}
                            </span>
                          )}
                        </div>
                        {task.due_at && !done && <p className="text-xs text-gray-400 mt-1">{formatDate(task.due_at)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
