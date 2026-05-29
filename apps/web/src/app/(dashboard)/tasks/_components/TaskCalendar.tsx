'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, TaskStatus } from '@fambiz/types';

interface TaskCalendarProps {
  tasks: Task[];
  month: string; // "YYYY-MM"
  role: string | null;
}

// ---- 定数 ----------------------------------------------------------------

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const STATUS_FILTERS: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: '未対応' },
  { value: 'reported', label: '対応済' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
  { value: 'expired', label: '期限切れ' },
];

// タスク詳細画面のバッジ色と統一したステータス色
const STATUS_CHIP_STYLES: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  reported: 'bg-blue-100 text-blue-600',
  completed: 'bg-green-100 text-green-600',
  cancelled: 'bg-red-100 text-red-600',
  expired: 'bg-red-100 text-red-600',
};


// 複数日バーのレイアウト定数
const BAR_H = 20;       // バーの高さ（px）
const BAR_GAP = 2;      // バー間の隙間（px）
const BARS_PAD = 4;     // バーエリア上下パディング（px）

// ---- 型 ------------------------------------------------------------------

interface MultiDayBar {
  task: Task;
  startCol: number;     // 0–6 (週内の開始列)
  colSpan: number;      // 1–7 (連結する列数)
  lane: number;         // 縦方向の積み上げレーン番号
  startsInWeek: boolean; // この週内で始まるか（左端を丸くする）
  endsInWeek: boolean;   // この週内で終わるか（右端を丸くする）
}

// ---- ユーティリティ -------------------------------------------------------

/** ISO 8601 UTC 文字列を JST の YYYY-MM-DD 文字列に変換する */
function isoToJSTDate(isoStr: string): string {
  const d = new Date(isoStr);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
}

/** 現在の JST 日付を YYYY-MM-DD 形式で返す */
function getTodayJST(): string {
  return isoToJSTDate(new Date().toISOString());
}

/** 現在の JST 月を YYYY-MM 形式で返す */
function getCurrentMonthJST(): string {
  const d = new Date();
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getPrevMonth(year: number, mon: number): string {
  const d = new Date(year, mon - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMonth(year: number, mon: number): string {
  const d = new Date(year, mon, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** タスクが複数日にまたがるかを判定する（start_time と end_time が異なる JST 日付）*/
function isMultiDay(task: Task): boolean {
  if (!task.start_time || !task.end_time) return false;
  return isoToJSTDate(task.start_time) !== isoToJSTDate(task.end_time);
}

/** 単日タスクの表示位置となる JST 日付を返す（due_date 優先、次に start_time）*/
function getSingleDayDate(task: Task): string | null {
  const src = task.due_date ?? task.start_time;
  return src ? isoToJSTDate(src) : null;
}

/** 単日タスクのチップ色を返す（ステータス色で統一）*/
function getChipStyle(task: Task): string {
  return STATUS_CHIP_STYLES[task.status];
}

/**
 * 月のカレンダーグリッドを週行ごとに構築する。
 * 前月・翌月の補完日を含む YYYY-MM-DD 文字列の 2 次元配列を返す。
 */
function buildWeekRows(year: number, mon: number): string[][] {
  const toDateStr = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

  const firstDay = new Date(Date.UTC(year, mon - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const startWeekday = firstDay.getUTCDay(); // 0=日

  const weeks: string[][] = [];
  let week: string[] = [];

  // 前月の補完日
  for (let i = 0; i < startWeekday; i++) {
    week.push(toDateStr(new Date(Date.UTC(year, mon - 1, 1 - startWeekday + i))));
  }

  // 当月日
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(toDateStr(new Date(Date.UTC(year, mon - 1, day))));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  // 翌月の補完日
  if (week.length > 0) {
    let nd = 1;
    while (week.length < 7) {
      week.push(toDateStr(new Date(Date.UTC(year, mon, nd++))));
    }
    weeks.push(week);
  }

  return weeks;
}

/**
 * 週行内の複数日タスクのバー配置を計算する。
 * 重なりがある場合はレーンを積み上げる。
 */
function computeBarsForWeek(week: string[], tasks: Task[]): MultiDayBar[] {
  const weekStart = week[0];
  const weekEnd = week[6];

  const overlapping = tasks.filter((task) => {
    const s = isoToJSTDate(task.start_time!);
    const e = isoToJSTDate(task.end_time!);
    return s <= weekEnd && e >= weekStart;
  });

  // 開始日が早い順、同じなら長い順で安定ソートする
  const sorted = [...overlapping].sort((a, b) => {
    const as = isoToJSTDate(a.start_time!);
    const bs = isoToJSTDate(b.start_time!);
    if (as !== bs) return as.localeCompare(bs);
    const ad = new Date(a.end_time!).getTime() - new Date(a.start_time!).getTime();
    const bd = new Date(b.end_time!).getTime() - new Date(b.start_time!).getTime();
    return bd - ad;
  });

  const occupied: boolean[][] = []; // occupied[lane][col]
  const bars: MultiDayBar[] = [];

  for (const task of sorted) {
    const taskStart = isoToJSTDate(task.start_time!);
    const taskEnd = isoToJSTDate(task.end_time!);

    // 週境界でクリップする
    const effStart = taskStart < weekStart ? weekStart : taskStart;
    const effEnd = taskEnd > weekEnd ? weekEnd : taskEnd;

    const startCol = week.indexOf(effStart);
    const endCol = week.indexOf(effEnd);
    if (startCol === -1 || endCol === -1) continue;

    const colSpan = endCol - startCol + 1;

    // 空きレーンを探す
    let lane = 0;
    while (true) {
      if (!occupied[lane]) occupied[lane] = Array(7).fill(false);
      let free = true;
      for (let c = startCol; c <= endCol; c++) {
        if (occupied[lane][c]) { free = false; break; }
      }
      if (free) break;
      lane++;
    }

    for (let c = startCol; c <= endCol; c++) occupied[lane][c] = true;

    bars.push({
      task,
      startCol,
      colSpan,
      lane,
      startsInWeek: taskStart >= weekStart,
      endsInWeek: taskEnd <= weekEnd,
    });
  }

  return bars;
}

// ---- コンポーネント -------------------------------------------------------

export function TaskCalendar({ tasks, month, role }: TaskCalendarProps) {
  const router = useRouter();

  const [activeStatuses, setActiveStatuses] = useState<Set<TaskStatus>>(
    new Set<TaskStatus>(['pending', 'reported', 'completed', 'cancelled', 'expired']),
  );

  const [year, mon] = month.split('-').map(Number);
  const todayKey = getTodayJST();
  const currentMonth = getCurrentMonthJST();
  const isCurrentMonth = month === currentMonth;

  const toggleStatus = (status: TaskStatus) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) { next.delete(status); } else { next.add(status); }
      return next;
    });
  };

  const filteredTasks = tasks.filter((t) => activeStatuses.has(t.status));

  // 複数日タスクと単日タスクに分類する
  const multiDayTasks = useMemo(
    () => filteredTasks.filter(isMultiDay),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTasks.map((t) => t.id + t.status).join(',')],
  );

  const singleDayTasks = useMemo(
    () => filteredTasks.filter((t) => !isMultiDay(t)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTasks.map((t) => t.id + t.status).join(',')],
  );

  // 単日タスクを日付ごとにグループ化する
  const tasksByDate = useMemo(() => {
    return singleDayTasks.reduce<Record<string, Task[]>>((acc, task) => {
      const key = getSingleDayDate(task);
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [singleDayTasks]);

  const weeks = useMemo(() => buildWeekRows(year, mon), [year, mon]);

  const currentMonthPrefix = `${year}-${String(mon).padStart(2, '0')}`;

  return (
    <div className="space-y-4">

      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/tasks?month=${getPrevMonth(year, mon)}`)}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          &lt; 前月
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-800">{year}年{mon}月</span>
          {!isCurrentMonth && (
            <button
              onClick={() => router.push(`/tasks?month=${currentMonth}`)}
              className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              今月
            </button>
          )}
        </div>
        <button
          onClick={() => router.push(`/tasks?month=${getNextMonth(year, mon)}`)}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          次月 &gt;
        </button>
      </div>

      {/* ステータスフィルタ */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 bg-white rounded-xl border px-4 py-3">
        <span className="text-sm font-medium text-gray-500 self-center">表示:</span>
        {STATUS_FILTERS.map(({ value, label }) => {
          const checked = activeStatuses.has(value);
          return (
            <label key={value} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleStatus(value)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${STATUS_CHIP_STYLES[value]}`}>
                {label}
              </span>
            </label>
          );
        })}
      </div>

      {/* カレンダーグリッド */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {WEEKDAY_LABELS.map((day, i) => (
            <div
              key={day}
              className={`py-2 text-center text-sm font-semibold ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 週行ループ */}
        {weeks.map((week, weekIdx) => {
          const bars = computeBarsForWeek(week, multiDayTasks);
          const laneCount = bars.length > 0 ? Math.max(...bars.map((b) => b.lane)) + 1 : 0;
          const barsAreaH = laneCount > 0
            ? BARS_PAD * 2 + laneCount * BAR_H + (laneCount - 1) * BAR_GAP
            : 0;
          const isLastWeek = weekIdx === weeks.length - 1;

          return (
            <div key={weekIdx} className={!isLastWeek ? 'border-b' : ''}>

              {/* 複数日バーエリア（バーがある週のみ表示） */}
              {laneCount > 0 && (
                <div className="relative border-b border-gray-100" style={{ height: barsAreaH }}>
                  {bars.map((bar) => {
                    const topPx = BARS_PAD + bar.lane * (BAR_H + BAR_GAP);
                    const leftPct = (bar.startCol / 7) * 100;
                    const widthPct = (bar.colSpan / 7) * 100;

                    // 左端: この週で始まる→丸め、前週から続く→直角
                    // 右端: この週で終わる→丸め、次週へ続く→直角
                    const roundL = bar.startsInWeek ? 'rounded-l-full pl-2' : 'pl-1';
                    const roundR = bar.endsInWeek ? 'rounded-r-full pr-2' : 'pr-1';

                    return (
                      <button
                        key={`${bar.task.id}-w${weekIdx}`}
                        onClick={() => router.push(`/tasks/${bar.task.id}`)}
                        title={bar.task.task_name}
                        className={`absolute text-xs font-medium truncate transition-opacity hover:opacity-75 ${STATUS_CHIP_STYLES[bar.task.status]} ${roundL} ${roundR}`}
                        style={{
                          top: topPx,
                          height: BAR_H,
                          lineHeight: `${BAR_H}px`,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                      >
                        {/* タスク名は開始端にのみ表示する */}
                        {bar.startsInWeek ? bar.task.task_name : '…'}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 日付セル行 */}
              <div className="grid grid-cols-7">
                {week.map((dateStr, colIdx) => {
                  const isInMonth = dateStr.startsWith(currentMonthPrefix);
                  const dayNum = parseInt(dateStr.split('-')[2]);
                  const isToday = dateStr === todayKey;
                  const dayTasks = tasksByDate[dateStr] ?? [];
                  const displayTasks = dayTasks.slice(0, 3);
                  const extraCount = dayTasks.length - displayTasks.length;
                  const isLastCol = colIdx === 6;

                  const dayNumClass = isToday
                    ? 'bg-blue-600 text-white rounded-full'
                    : colIdx === 0
                      ? 'text-red-500'
                      : colIdx === 6
                        ? 'text-blue-500'
                        : isInMonth
                          ? 'text-gray-700'
                          : 'text-gray-300';

                  return (
                    <div
                      key={dateStr}
                      className={`min-h-[90px] p-1 ${!isLastCol ? 'border-r' : ''} ${isToday ? 'bg-blue-50' : !isInMonth ? 'bg-gray-50' : ''}`}
                    >
                      {/* 日付番号 */}
                      <div className="mb-1">
                        <span className={`inline-flex items-center justify-center w-6 h-6 text-sm font-medium ${dayNumClass}`}>
                          {dayNum}
                        </span>
                      </div>

                      {/* 単日タスクチップ */}
                      <div className="space-y-0.5">
                        {displayTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => router.push(`/tasks/${task.id}`)}
                            title={task.task_name}
                            className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate block transition-opacity hover:opacity-75 ${getChipStyle(task)}`}
                          >
                            {task.task_name}
                          </button>
                        ))}
                        {extraCount > 0 && (
                          <div className="text-xs text-gray-400 px-1">+{extraCount}件</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {/* 空状態メッセージ */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
          <p className="text-gray-500">この月のタスクはありません</p>
          {role === 'parent' && (
            <button
              onClick={() => router.push('/tasks/new')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              タスクを登録する
            </button>
          )}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
          <p className="text-gray-500 text-sm">選択したステータスのタスクはありません</p>
        </div>
      ) : null}

    </div>
  );
}
