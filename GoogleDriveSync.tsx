import { Calendar, CheckCircle2, ChevronRight, Edit3, Trash2, Clock } from "lucide-react";
import { 
  EducationItem, 
  STATUS_MAP, 
  getCategoryStyles, 
  calculateMinutes, 
  formatDuration 
} from "../types";

interface ItemCardProps {
  item: EducationItem;
  onEdit: (item: EducationItem) => void;
  onDelete: (item: EducationItem) => void;
}

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const catInfo = getCategoryStyles(item.category);
  const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.not_started;

  const durationMinutes = calculateMinutes(item.startTime, item.endTime);
  const formattedDuration = formatDuration(durationMinutes);

  // Format YYYY-MM-DD to nicer format, e.g., 2026/06/23
  const formatDateString = (dateStr: string) => {
    if (!dateStr) return "日付未設定";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="group bg-white rounded-3xl border border-slate-250 hover:border-blue-500/55 p-6 flex flex-col justify-between cursor-pointer relative overflow-hidden h-full shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      onClick={() => onEdit(item)}
      id={`item-card-${item.id}`}
    >
      {/* Category color line accent on top */}
      <div 
        className="absolute top-0 left-0 right-0 h-2 transition-colors"
        style={{ backgroundColor: catInfo.hex }}
      />

      <div className="flex flex-col gap-4">
        {/* Card Header: Category & Status */}
        <div className="flex items-center justify-between pt-1">
          <span className={`inline-flex items-center text-xs font-black px-3.5 py-1.5 rounded-xl border tracking-wide uppercase transition-all shadow-xs ${catInfo.bgColor} ${catInfo.color} ${catInfo.borderColor}`}>
            {catInfo.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl tracking-wide transition-all shadow-xs ${statusInfo.bgColor} ${statusInfo.color}`}>
            {item.status === "completed" && <CheckCircle2 className="w-4 h-4" />}
            {statusInfo.label}
          </span>
        </div>

        {/* Title and Date Info */}
        <div className="space-y-3">
          <h3 className="font-black text-slate-900 text-lg md:text-xl leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
            {item.title}
          </h3>

          {/* History Count Indicator */}
          {item.history && item.history.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
                🔄 合計指導回数: {item.history.length + 1}回
              </span>
              <span className="text-[10px] text-slate-400 font-extrabold bg-slate-50 px-2 py-1 rounded-xl border border-slate-150">
                最新追加: {formatDateString(item.history[0].date)}
              </span>
            </div>
          )}

          {/* Activity Date & Duration bar */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-slate-500 text-xs font-black bg-slate-50 p-3 rounded-xl border border-slate-150">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{formatDateString(item.date)}</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
              <span>{item.startTime}〜{item.endTime} ({formattedDuration})</span>
            </div>
            {item.instructor && (
              <>
                <span className="text-slate-300">|</span>
                <div className="text-blue-700 font-extrabold bg-blue-50/70 px-2 py-0.5 rounded-lg border border-blue-100/40 text-[10px]">
                  担当: {item.instructor}
                </div>
              </>
            )}
          </div>

          {/* 教育内容 section */}
          <div className="space-y-1 bg-slate-50/70 p-3.5 rounded-xl border border-slate-150 shadow-inner">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              指導・研修内容
            </div>
            <p className="text-slate-800 text-sm line-clamp-3 leading-relaxed font-semibold">
              {item.description || "指導内容のメモはありません。タッチして入力しましょう。"}
            </p>
          </div>

          {/* 理解度チェック section */}
          <div className="space-y-1 bg-blue-50/20 p-3.5 rounded-xl border border-blue-50/40">
            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              理解度・指導の振り返り
            </div>
            <p className="text-slate-900 text-sm line-clamp-3 leading-relaxed font-semibold">
              {item.understandingCheck || "理解度・到達度の記録はありません。タッチして評価を記入しましょう。"}
            </p>
          </div>
        </div>
      </div>

      {/* Card Footer: Progress and actions */}
      <div className="mt-5 space-y-4 pt-4 border-t border-slate-100">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-black">
            <span className="text-slate-550 uppercase tracking-wider">到達・進捗状況</span>
            <span className="font-extrabold text-sm" style={{ color: catInfo.hex }}>{item.progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ backgroundColor: catInfo.hex, width: `${item.progress}%` }}
            />
          </div>
        </div>

        {/* Action icons & timestamp */}
        <div className="flex items-center justify-between text-slate-400 text-xs font-black">
          <span>登録日: {formatDateString(item.createdAt ? item.createdAt.substring(0, 10) : "")}</span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title="編集"
              id={`edit-btn-${item.id}`}
            >
              <Edit3 className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              title="削除"
              id={`delete-btn-${item.id}`}
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
            <span className="p-1.5 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-xl transition-all self-center ml-1">
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
