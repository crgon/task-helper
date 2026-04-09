export interface Task {
  id: number;
  title: string;
  category: string;
  due_at: string | null;
  priority: number;
  note: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface NewTask {
  title: string;
  category?: string;
  due_at?: string;
  priority?: number;
  note?: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  suggested_due_at: string | null;
  estimate_hours: number | null;
  note: string | null;
  completed_at: string | null;
}

export function urgencyColor(due_at: string | null, completed: boolean = false) {
  if (completed) return {
    dot: "bg-gray-300",
    border: "border-l-gray-200",
    badge: "bg-gray-100 text-gray-400",
    label: "已完成",
    ring: "ring-gray-200",
  };
  if (!due_at) return {
    dot: "bg-gray-300",
    border: "border-l-gray-300",
    badge: "bg-gray-100 text-gray-500",
    label: "无截止",
    ring: "ring-gray-200",
  };

  const diff = (new Date(due_at).getTime() - Date.now()) / 86400000;

  if (diff < 0) return { dot: "bg-red-500", border: "border-l-red-400", badge: "bg-red-50 text-red-600", label: "已逾期", ring: "ring-red-200" };
  if (diff <= 1) return { dot: "bg-red-400", border: "border-l-red-300", badge: "bg-red-50 text-red-500", label: "今天", ring: "ring-red-100" };
  if (diff <= 3) return { dot: "bg-orange-400", border: "border-l-orange-300", badge: "bg-orange-50 text-orange-600", label: "3天内", ring: "ring-orange-100" };
  if (diff <= 7) return { dot: "bg-yellow-400", border: "border-l-yellow-300", badge: "bg-yellow-50 text-yellow-700", label: "本周", ring: "ring-yellow-100" };
  if (diff <= 30) return { dot: "bg-blue-400", border: "border-l-blue-300", badge: "bg-blue-50 text-blue-600", label: "本月", ring: "ring-blue-100" };
  return { dot: "bg-green-400", border: "border-l-green-300", badge: "bg-green-50 text-green-700", label: "未来", ring: "ring-green-100" };
}

export function daysLeft(due_at: string): string {
  const diff = Math.ceil((new Date(due_at).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `逾期 ${Math.abs(diff)} 天`;
  if (diff === 0) return "今天截止";
  if (diff === 1) return "明天截止";
  return `还有 ${diff} 天`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "numeric", day: "numeric",
  });
}

export function timeGroup(due_at: string | null): string {
  if (!due_at) return "无截止时间";
  const diff = (new Date(due_at).getTime() - Date.now()) / 86400000;
  if (diff < 0) return "已逾期";
  if (diff <= 1) return "今天";
  if (diff <= 7) return "本周";
  if (diff <= 30) return "本月";
  return "未来";
}

export const GROUP_ORDER = ["已逾期", "今天", "本周", "本月", "未来", "无截止时间"];