import React, { useState } from "react";
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Award, 
  BarChart3, 
  GraduationCap, 
  Calendar, 
  Activity, 
  HeartPulse, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  X
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { 
  EducationItem, 
  getCategoryStyles, 
  calculateMinutes, 
  formatDuration 
} from "../types";

interface DashboardProps {
  items: EducationItem[];
  categories: string[];
  isLoading: boolean;
  onSelectCategory?: (categoryName: string) => void;
}

export default function Dashboard({ items, categories, isLoading, onSelectCategory }: DashboardProps) {
  // Calendar state and event mapping
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Collect all events including repeated history
  const allEvents: {
    itemId: string;
    title: string;
    category: string;
    date: string; // YYYY-MM-DD
    startTime: string;
    endTime: string;
    isHistory: boolean;
    instructor?: string;
    status: string;
  }[] = [];

  items.forEach(item => {
    if (!item) return;
    if (item.date) {
      allEvents.push({
        itemId: item.id,
        title: item.title,
        category: item.category,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        isHistory: false,
        instructor: item.instructor,
        status: item.status,
      });
    }
    if (item.history && Array.isArray(item.history)) {
      item.history.forEach(hist => {
        if (hist.date) {
          allEvents.push({
            itemId: item.id,
            title: item.title,
            category: item.category,
            date: hist.date,
            startTime: hist.startTime,
            endTime: hist.endTime,
            isHistory: true,
            instructor: hist.instructor || item.instructor,
            status: "completed",
          });
        }
      });
    }
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0: Sunday, 6: Saturday
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false,
      });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const calendarDays = getDaysInMonth(currentMonth);

  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatJapanDate = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const [y, m, day] = parts.map(Number);
    return `${y}年${m}月${day}日`;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDateStr(null);
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDateStr(formatDateString(today));
  };

  // Compute metrics
  const totalItems = items.length;
  
  const completedItems = items.filter(item => item && item.status === "completed").length;
  const inProgressItems = items.filter(item => item && item.status === "in_progress").length;
  const notStartedItems = items.filter(item => item && item.status === "not_started").length;

  // Overall Progress calculation: average of all item progress values
  const overallProgress = totalItems > 0 
    ? Math.round(items.reduce((sum, item) => sum + Number(item?.progress || 0), 0) / totalItems)
    : 0;

  // Calculate total session count including repeated ones
  const totalSessions = items.reduce((sum, item) => {
    if (!item) return sum;
    return sum + 1 + (item.history?.length || 0);
  }, 0);

  // Calculate sum total education time across all items including repeating histories
  const totalMinutesAll = items.reduce((sum, item) => {
    if (!item) return sum;
    const primaryMinutes = calculateMinutes(item.startTime, item.endTime);
    const historyMinutes = item.history?.reduce((hSum, hist) => {
      return hSum + calculateMinutes(hist.startTime, hist.endTime);
    }, 0) || 0;
    return sum + primaryMinutes + historyMinutes;
  }, 0);
  const formattedTotalMinutesAll = formatDuration(totalMinutesAll);

  // Category statistics for custom categories
  const categoryStats = categories.map(categoryName => {
    const catItems = items.filter(item => item && item.category === categoryName);
    const count = catItems.length;
    const catProgress = count > 0
      ? Math.round(catItems.reduce((sum, item) => sum + Number(item?.progress || 0), 0) / count)
      : 0;
    
    const catMinutes = catItems.reduce((sum, item) => {
      if (!item) return sum;
      const primaryMinutes = calculateMinutes(item.startTime, item.endTime);
      const historyMinutes = item.history?.reduce((hSum, hist) => {
        return hSum + calculateMinutes(hist.startTime, hist.endTime);
      }, 0) || 0;
      return sum + primaryMinutes + historyMinutes;
    }, 0);

    return {
      category: categoryName,
      styles: getCategoryStyles(categoryName),
      count,
      progress: catProgress,
      totalMinutes: catMinutes,
      formattedDuration: formatDuration(catMinutes)
    };
  });

  return (
    <div
      className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md md:p-8 transition-all"
      id="dashboard-container"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl" id="dashboard-icon-bg">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">研修・指導の進捗分析</h2>
            <p className="text-sm md:text-base text-slate-500 font-medium">現在の学習進捗、合計時間、および科目ごとの到達状況</p>
          </div>
        </div>

        {totalItems > 0 && (
          <span className="text-sm bg-blue-50 text-blue-900 px-4 py-2 rounded-full border border-blue-100 font-black self-start sm:self-auto shadow-xs">
            登録項目数: 全 {totalItems} 件
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent" />
          <p className="text-base font-bold">教育データを読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-8" id="dashboard-analyzed-content">
          {totalItems === 0 && (
            <div className="p-5 bg-blue-50/75 border border-blue-200 text-blue-950 rounded-2xl flex items-start gap-3 shadow-xs">
              <HeartPulse className="w-5 h-5 text-blue-600 animate-pulse mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-extrabold text-blue-900 mb-0.5">登録されている研修項目がまだありません</p>
                <p className="text-blue-800 font-semibold leading-relaxed">
                  右上の「研修項目を新規追加」ボタンから指導内容、日付、開始・終了時間などを入力して、最初の教育項目を追加しましょう。追加するとカレンダーやグラフにリアルタイムで即時反映されます！
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Overall progress, total hours, and status counts at a glance */}
          <div className="lg:col-span-6 flex flex-col p-6 bg-gradient-to-br from-blue-50/40 to-slate-100/60 rounded-3xl border border-blue-500/10 relative overflow-hidden shadow-xs">
            <div className="absolute -right-12 -top-12 w-36 h-36 bg-blue-100/20 rounded-full blur-2xl" />
            
            <h3 className="text-sm md:text-base font-black text-blue-900 mb-6 tracking-wide uppercase flex items-center gap-2 border-b border-blue-100/50 pb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>全体の学習・指導進捗率 & 項目サマリー</span>
            </h3>
            
            <div className="flex flex-col md:flex-row items-center justify-around gap-6 mb-6">
              {/* Circular Progress Gauge */}
              <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    className="stroke-slate-150 fill-none"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    className="stroke-blue-600 fill-none transition-all duration-700 ease-out"
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 70}
                    strokeDashoffset={2 * Math.PI * 70 * (1 - overallProgress / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-900 tracking-tight">
                    {overallProgress}<span className="text-lg font-bold text-slate-500">%</span>
                  </span>
                  <span className="text-xs text-slate-500 font-extrabold tracking-wider mt-0.5">平均進捗率</span>
                </div>
              </div>

              {/* Total accumulated times */}
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">総研修時間</div>
                    <div className="text-base md:text-lg font-black text-slate-800">{formattedTotalMinutesAll}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs">
                  <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 animate-pulse" />
                  <div>
                    <div className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">総指導・受講回数</div>
                    <div className="text-base md:text-lg font-black text-slate-800">{totalSessions} 回</div>
                  </div>
                </div>

                {overallProgress === 100 && (
                  <div className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-100 text-emerald-900 text-xs font-black rounded-xl shadow-xs">
                    <Award className="w-4.5 h-4.5 text-emerald-600" />
                    <span>全項目完了しました！</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status counts displayed clearly in a single, high-contrast grid */}
            <div className="mt-auto pt-4 border-t border-slate-200/80">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">研修項目の進捗ステータス内訳</p>
              <div className="grid grid-cols-4 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                  <span className="text-[10px] md:text-xs text-slate-400 font-bold">全項目数</span>
                  <span className="text-lg md:text-xl font-black text-slate-800">{totalItems}</span>
                  <span className="text-[9px] text-slate-400 font-bold">100%</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                  <span className="text-[10px] md:text-xs text-slate-500 font-bold">未着手</span>
                  <span className="text-lg md:text-xl font-black text-slate-700">{notStartedItems}</span>
                  <span className="text-[9px] text-slate-400 font-bold">{totalItems > 0 ? `${Math.round(notStartedItems/totalItems * 100)}%` : "0%"}</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex flex-col items-center justify-center">
                  <span className="text-[10px] md:text-xs text-amber-700 font-bold">進行中</span>
                  <span className="text-lg md:text-xl font-black text-amber-800">{inProgressItems}</span>
                  <span className="text-[9px] text-amber-600 font-bold">{totalItems > 0 ? `${Math.round(inProgressItems/totalItems * 100)}%` : "0%"}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-150 flex flex-col items-center justify-center">
                  <span className="text-[10px] md:text-xs text-emerald-700 font-bold">完了</span>
                  <span className="text-lg md:text-xl font-black text-emerald-800">{completedItems}</span>
                  <span className="text-[9px] text-emerald-600 font-bold">{totalItems > 0 ? `${Math.round(completedItems/totalItems * 100)}%` : "0%"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Category Breakdown with Tap interaction */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="p-5 bg-slate-50/80 rounded-3xl border border-slate-200/80 flex flex-col h-full gap-4">
              <div className="space-y-1">
                <h3 className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-wider">カテゴリー別の状況と時間 (タッチで項目を絞り込み)</h3>
                <p className="text-slate-400 text-xs font-semibold">各カテゴリーをタッチすると、そのカテゴリーに属する項目一覧が開きます。</p>
              </div>
              
              {categories.length === 0 ? (
                <div className="text-sm text-slate-500 py-6 text-center">
                  カテゴリーを追加すると、ここに分析データが表示されます。
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[280px] overflow-y-auto pr-1">
                  {categoryStats.map((cat) => (
                    <button
                      key={cat.category}
                      onClick={() => onSelectCategory?.(cat.category)}
                      className="text-left bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:ring-4 hover:ring-blue-50 transition-all duration-150 flex flex-col gap-2 shadow-xs group cursor-pointer"
                      title={`${cat.category}一覧を表示`}
                    >
                      <div className="flex justify-between items-start text-xs md:text-sm">
                        <span className={`font-black group-hover:text-blue-600 transition-colors ${cat.styles.color}`}>
                          {cat.category}
                        </span>
                        <span className="text-slate-500 font-extrabold text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">
                          {cat.count}件 ({cat.progress}%)
                        </span>
                      </div>

                      {/* Display category specific hours */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span>合計: <span className="text-slate-800 font-extrabold">{cat.formattedDuration}</span></span>
                      </div>

                      {/* Mini indicator bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            backgroundColor: cat.styles.hex,
                            width: `${cat.progress}%`
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Second Row: Calendar & Histogram/Lack Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 pt-8 border-t border-slate-150">
          
          {/* Calendar Section (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col bg-slate-50/50 p-6 rounded-3xl border border-slate-200 gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>教育実施カレンダー</span>
                </h3>
                <p className="text-slate-400 text-xs font-semibold">いつ、何の教育・指導を行ったかを一目で把握できます。</p>
              </div>

              {/* Month Navigator Controls */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto shadow-xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="前月"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs font-black text-slate-800 min-w-[90px] text-center">
                  {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="翌月"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-md ml-1 transition-colors cursor-pointer"
                >
                  今日
                </button>
              </div>
            </div>

            {/* Calendar Grid Container */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
              {/* Day Labels Row */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["日", "月", "火", "水", "木", "金", "土"].map((dayName, index) => (
                  <span
                    key={dayName}
                    className={`text-[11px] font-black uppercase tracking-wider ${
                      index === 0
                        ? "text-rose-500"
                        : index === 6
                        ? "text-blue-500"
                        : "text-slate-400"
                    }`}
                  >
                    {dayName}
                  </span>
                ))}
              </div>

              {/* Month Days Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((cell, idx) => {
                  const dateStr = formatDateString(cell.date);
                  const isToday = dateStr === formatDateString(new Date());
                  const dayEvents = allEvents.filter((ev) => ev.date === dateStr);
                  const isSelected = selectedDateStr === dateStr;
                  const isSun = cell.date.getDay() === 0;
                  const isSat = cell.date.getDay() === 6;

                  return (
                    <button
                      type="button"
                      key={`${dateStr}-${idx}`}
                      onClick={() => setSelectedDateStr(isSelected ? null : dateStr)}
                      className={`aspect-square p-1 rounded-xl flex flex-col justify-between transition-all relative border outline-none group cursor-pointer ${
                        !cell.isCurrentMonth
                          ? "bg-slate-50/20 text-slate-300 border-transparent"
                          : isToday
                          ? "bg-blue-50/50 text-blue-800 border-blue-300 font-black"
                          : isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-102"
                          : "bg-white hover:bg-blue-50/30 text-slate-700 border-slate-100 hover:border-blue-200"
                      } ${
                        cell.isCurrentMonth && !isSelected
                          ? isSun
                            ? "text-rose-600"
                            : isSat
                            ? "text-blue-600"
                            : ""
                          : ""
                      }`}
                    >
                      {/* Day number */}
                      <span className="text-xs font-black select-none">
                        {cell.date.getDate()}
                      </span>

                      {/* Dots representation */}
                      <div className="flex flex-wrap gap-0.5 justify-center w-full min-h-[6px] mt-auto">
                        {dayEvents.slice(0, 3).map((ev, i) => {
                          const styles = getCategoryStyles(ev.category);
                          return (
                            <span
                              key={`${ev.itemId}-${i}`}
                              className={`w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-125 ${
                                isSelected ? "bg-white" : ""
                              }`}
                              style={{ backgroundColor: isSelected ? undefined : styles.hex }}
                              title={`${ev.title} (${ev.category})`}
                            />
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span
                            className={`text-[8px] leading-none font-black self-center ${
                              isSelected ? "text-white" : "text-slate-400"
                            }`}
                          >
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day details modal overlay */}
            {selectedDateStr && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]"
                onClick={() => setSelectedDateStr(null)}
                id="calendar-detail-modal-overlay"
              >
                <div 
                  className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-[zoomIn_0.15s_ease-out] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-blue-50/50 to-slate-50/50 p-5 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100/60 text-blue-700 rounded-xl flex items-center justify-center shadow-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs text-slate-400 font-extrabold tracking-wider uppercase">実施された教育内容</h4>
                        <p className="text-sm font-black text-slate-800">{formatJapanDate(selectedDateStr)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDateStr(null)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                      title="閉じる"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto max-h-[50vh] space-y-3">
                    {allEvents.filter((ev) => ev.date === selectedDateStr).length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <p className="text-2xl">📝</p>
                        <p className="text-xs text-slate-400 font-semibold italic">
                          この日に登録された指導・研修はありません。
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allEvents
                          .filter((ev) => ev.date === selectedDateStr)
                          .map((ev, idx) => {
                            const styles = getCategoryStyles(ev.category);
                            return (
                              <div
                                key={`${ev.itemId}-${idx}`}
                                className="bg-slate-50/70 p-4 rounded-2xl border border-slate-150 flex flex-col gap-2.5 shadow-xs hover:border-slate-300 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span
                                    className={`text-[9px] px-2.5 py-0.5.5 rounded-lg font-bold ${styles.bgColor} ${styles.color} border ${styles.borderColor}`}
                                  >
                                    {ev.category}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-black flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    {ev.startTime} - {ev.endTime}
                                  </span>
                                </div>
                                <p className="text-xs font-black text-slate-800 leading-relaxed">{ev.title}</p>
                                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] text-slate-400 font-semibold">
                                  <span>指導者: {ev.instructor || "未設定"}</span>
                                  {ev.isHistory ? (
                                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-extrabold">
                                      反復実施
                                    </span>
                                  ) : (
                                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-extrabold">
                                      新規実施
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedDateStr(null)}
                      className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors text-xs cursor-pointer shadow-xs active:scale-98"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Histogram & Lack Analysis (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-50/50 p-6 rounded-3xl border border-slate-200 gap-5">
            <div className="space-y-0.5 border-b border-slate-150 pb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>教育内容のムラ・過不足分析</span>
              </h3>
              <p className="text-slate-400 text-xs font-semibold">各カテゴリーの指導回数を可視化し、偏りをチェックします。</p>
            </div>

            {/* Recharts BarChart container */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex-1 flex flex-col justify-center min-h-[260px]">
              {categories.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium italic text-center py-6">
                  分析可能なカテゴリーデータがありません。
                </p>
              ) : (
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart
                      data={(() => {
                        const counts = categories.reduce((acc, cat) => {
                          acc[cat] = 0;
                          return acc;
                        }, {} as Record<string, number>);

                        allEvents.forEach((ev) => {
                          if (counts[ev.category] !== undefined) {
                            counts[ev.category]++;
                          }
                        });

                        return Object.keys(counts).map((catName) => {
                          const count = counts[catName];
                          const styles = getCategoryStyles(catName);
                          return {
                            name: catName,
                            "実施回数": count,
                            fill: styles.hex,
                          };
                        });
                      })()}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(37, 99, 235, 0.05)" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white text-[11px] p-2 rounded-lg shadow-md border border-slate-800 font-black">
                                <p className="mb-0.5">{data.name}</p>
                                <p className="text-blue-400">実施回数: {data["実施回数"]} 回</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="実施回数" radius={[4, 4, 0, 0]} maxBarSize={32}>
                        {categories.map((catName, index) => {
                          const styles = getCategoryStyles(catName);
                          return <Cell key={`cell-${index}`} fill={styles.hex} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* AI-like Education Audit Analysis Feedback box */}
            {categories.length > 0 && (
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-[11px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1 border-b border-slate-100 pb-1.5">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <span>教育内容のムラ診断</span>
                </h4>
                
                {(() => {
                  const counts = categories.reduce((acc, cat) => {
                    acc[cat] = 0;
                    return acc;
                  }, {} as Record<string, number>);

                  allEvents.forEach((ev) => {
                    if (counts[ev.category] !== undefined) {
                      counts[ev.category]++;
                    }
                  });

                  const statsList = Object.keys(counts).map((name) => ({
                    name,
                    count: counts[name],
                  }));

                  const sorted = [...statsList].sort((a, b) => a.count - b.count);
                  const least = sorted[0];
                  const most = sorted[sorted.length - 1];
                  const zeroCounts = sorted.filter((s) => s.count === 0);

                  let diagnosisText = "";
                  let suggestionText = "";

                  if (zeroCounts.length > 0) {
                    diagnosisText = `「${zeroCounts.map((z) => z.name).join("、")}」の教育がまだ1回も実施されていません。研修のカバー範囲にムラが生じています。`;
                    suggestionText = "指導計画が漏れていないか確認し、未着手のカテゴリーを優先的にカレンダー上でスケジュールすることをお勧めします。";
                  } else if (most.count - least.count >= 3) {
                    diagnosisText = `「${most.name}」の教育が活発（${most.count}回）な一方、「${least.name}」の実施頻度（${least.count}回）が低く、指導内容にムラが生じています。`;
                    suggestionText = "偏りを減らすため、次回は不足しているカテゴリーの研修を行い、教育全体のバランスを整えましょう。";
                  } else if (totalItems > 0) {
                    diagnosisText = "各カテゴリーの指導・研修がバランス良く行われており、教育内容の偏り（ムラ）はほぼ見られません。素晴らしい進め方です！";
                    suggestionText = "現在のペースを維持しながら、反復訓練が必要な項目についてカレンダーを見つつ復習を計画していきましょう。";
                  } else {
                    diagnosisText = "データが登録されていません。まずは研修・指導項目を追加してみましょう。";
                    suggestionText = "教育項目を登録すると、自動的にムラ・過不足の度合いを評価・分析します。";
                  }

                  return (
                    <div className="space-y-2 text-xs">
                      <p className="font-extrabold text-slate-800 leading-relaxed">
                        {diagnosisText}
                      </p>
                      <p className="text-slate-500 font-semibold leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                        💡 {suggestionText}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

        </div>
      </div>
      )}
    </div>
  );
}

