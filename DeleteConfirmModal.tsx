export type ItemStatus = "not_started" | "in_progress" | "completed";

export interface EducationHistoryItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  understandingCheck: string;
  instructor?: string;
}

export interface EducationItem {
  id: string;
  title: string;
  description: string;
  understandingCheck?: string; // Understanding check field (医療系項目)
  category: string; // Dynamic user inputted string category
  status: ItemStatus;
  progress: number; // 0 to 100
  date: string; // YYYY-MM-DD
  startTime: string; // e.g., "13:15"
  endTime: string; // e.g., "14:30"
  userId: string;
  createdAt: string;
  updatedAt: string;
  history?: EducationHistoryItem[];
  instructor?: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

const PRESET_COLORS = [
  { color: "text-blue-600", bgColor: "bg-blue-50/70", borderColor: "border-blue-100", hex: "#3b82f6" },
  { color: "text-rose-600", bgColor: "bg-rose-50/70", borderColor: "border-rose-100", hex: "#f43f5e" },
  { color: "text-emerald-600", bgColor: "bg-emerald-50/70", borderColor: "border-emerald-100", hex: "#10b981" },
  { color: "text-amber-600", bgColor: "bg-amber-50/70", borderColor: "border-amber-100", hex: "#f59e0b" },
  { color: "text-purple-600", bgColor: "bg-purple-50/70", borderColor: "border-purple-100", hex: "#a855f7" },
  { color: "text-cyan-600", bgColor: "bg-cyan-50/70", borderColor: "border-cyan-100", hex: "#06b6d4" },
  { color: "text-indigo-600", bgColor: "bg-indigo-50/70", borderColor: "border-indigo-100", hex: "#6366f1" },
  { color: "text-pink-600", bgColor: "bg-pink-50/70", borderColor: "border-pink-100", hex: "#ec4899" },
];

export function getCategoryStyles(categoryName: string) {
  if (!categoryName) {
    return {
      label: "未設定",
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-100",
      hex: "#64748b"
    };
  }
  // Simple deterministic hash based on name
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_COLORS.length;
  return {
    label: categoryName,
    ...PRESET_COLORS[index]
  };
}

export const STATUS_MAP: Record<ItemStatus, { label: string; color: string; bgColor: string }> = {
  not_started: {
    label: "未着手",
    color: "text-slate-500",
    bgColor: "bg-slate-100",
  },
  in_progress: {
    label: "進行中",
    color: "text-sky-500",
    bgColor: "bg-sky-100",
  },
  completed: {
    label: "完了",
    color: "text-emerald-500",
    bgColor: "bg-emerald-100",
  },
};

// Calculates the duration in minutes
export function calculateMinutes(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  const diff = endTotal - startTotal;
  return diff > 0 ? diff : 0;
}

// Formats duration in Japanese Kanji style (e.g., 1時間45分 or 30分)
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0分";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  }
  return `${m}分`;
}

// Generate times from 00:00 to 23:45 in 15 minute increments
export function generateTimeIncrements(): string[] {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      times.push(`${hh}:${mm}`);
    }
  }
  return times;
}
