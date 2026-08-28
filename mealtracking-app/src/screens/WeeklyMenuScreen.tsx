import { useEffect, useMemo, useState } from "react";
import { db, upsertMenuPlan, inferMealTiming } from "../db";
import type { CompletionLevel, MealTiming, MenuLog, MenuPlan } from "../types";
import { COMPLETION_LEVEL_META, MEAL_TIMINGS, MEAL_TIMING_LABEL } from "../labels";
import { toDateKey } from "../format";

interface WeeklyMenuScreenProps {
  onBack: () => void;
}

interface CellData {
  plan?: MenuPlan;
  logs: MenuLog[];
  levels: CompletionLevel[];
}

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];
const COMPLETION_LEVEL_ORDER: CompletionLevel[] = ["full", "half", "none"];

function cellKey(date: string, mealTiming: MealTiming): string {
  return `${date}__${mealTiming}`;
}

function getMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function WeeklyMenuScreen({ onBack }: WeeklyMenuScreenProps) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [plans, setPlans] = useState<MenuPlan[]>([]);
  const [logs, setLogs] = useState<MenuLog[]>([]);
  const [levelsByKey, setLevelsByKey] = useState<Map<string, Set<CompletionLevel>>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);

  const [editingCell, setEditingCell] = useState<
    { date: string; mealTiming: MealTiming } | null
  >(null);
  const [editMenuName, setEditMenuName] = useState("");

  async function loadData() {
    const [allPlans, allLogs, allRecords] = await Promise.all([
      db.menuPlans.toArray(),
      db.menuLogs.toArray(),
      db.records.toArray(),
    ]);
    setPlans(allPlans);
    setLogs(allLogs);

    const map = new Map<string, Set<CompletionLevel>>();
    for (const record of allRecords) {
      const recordedDate = new Date(record.recordedAt);
      const key = cellKey(toDateKey(recordedDate), inferMealTiming(recordedDate));
      const levels = map.get(key) ?? new Set<CompletionLevel>();
      for (const item of record.items) levels.add(item.level);
      map.set(key, levels);
    }
    setLevelsByKey(map);
    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadData();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const cellMap = useMemo(() => {
    const map = new Map<string, CellData>();
    for (const plan of plans) {
      const key = cellKey(plan.date, plan.mealTiming);
      const entry = map.get(key) ?? { logs: [], levels: [] };
      entry.plan = plan;
      map.set(key, entry);
    }
    for (const log of logs) {
      const key = cellKey(log.date, log.mealTiming);
      const entry = map.get(key) ?? { logs: [], levels: [] };
      entry.logs.push(log);
      map.set(key, entry);
    }
    for (const [key, levelSet] of levelsByKey) {
      const entry = map.get(key) ?? { logs: [], levels: [] };
      entry.levels = COMPLETION_LEVEL_ORDER.filter((level) => levelSet.has(level));
      map.set(key, entry);
    }
    return map;
  }, [plans, logs, levelsByKey]);

  function openEdit(date: string, mealTiming: MealTiming) {
    const existing = cellMap.get(cellKey(date, mealTiming))?.plan;
    setEditMenuName(existing?.menuName ?? "");
    setEditingCell({ date, mealTiming });
  }

  function closeEdit() {
    setEditingCell(null);
    setEditMenuName("");
  }

  async function handleSavePlan() {
    if (!editingCell) return;
    await upsertMenuPlan(editingCell.date, editingCell.mealTiming, editMenuName);
    await loadData();
    closeEdit();
  }

  function goToPreviousWeek() {
    setWeekStart((prev) => addDays(prev, -7));
  }

  function goToNextWeek() {
    setWeekStart((prev) => addDays(prev, 7));
  }

  function goToCurrentWeek() {
    setWeekStart(getMonday(new Date()));
  }

  const weekEnd = addDays(weekStart, 6);
  const weekRangeLabel = `${toDateKey(weekStart)} 〜 ${toDateKey(weekEnd)}`;

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">
              週間献立表
            </h1>
            <p className="text-sm text-orange-700 sm:text-base">
              予定と実施記録を突き合わせて確認できます
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="min-h-11 shrink-0 rounded-xl border-2 border-orange-500 bg-white px-5 text-base font-medium text-orange-600 transition active:scale-95"
          >
            ← 記録一覧へ戻る
          </button>
        </header>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousWeek}
              className="min-h-11 min-w-11 rounded-xl border-2 border-gray-200 bg-white px-3 text-base font-medium text-gray-700 transition active:scale-95"
            >
              ← 前週
            </button>
            <button
              type="button"
              onClick={goToNextWeek}
              className="min-h-11 min-w-11 rounded-xl border-2 border-gray-200 bg-white px-3 text-base font-medium text-gray-700 transition active:scale-95"
            >
              翌週 →
            </button>
            <button
              type="button"
              onClick={goToCurrentWeek}
              className="min-h-11 rounded-xl border-2 border-orange-500 bg-white px-4 text-base font-medium text-orange-600 transition active:scale-95"
            >
              今週
            </button>
          </div>
          <span className="text-sm font-semibold text-gray-600">
            {weekRangeLabel}
          </span>
        </section>

        {isLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-orange-100">
            <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-20 border-b border-orange-100 bg-orange-50 p-2 text-left text-xs font-semibold text-gray-500">
                    曜日
                  </th>
                  {MEAL_TIMINGS.map((mealTiming) => (
                    <th
                      key={mealTiming}
                      className="border-b border-l border-orange-100 bg-orange-50 p-2 text-left text-xs font-semibold text-gray-500"
                    >
                      {MEAL_TIMING_LABEL[mealTiming]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDays.map((day, index) => {
                  const dateKey = toDateKey(day);
                  return (
                    <tr key={dateKey}>
                      <th className="border-b border-orange-50 p-2 text-left align-top text-xs font-semibold text-gray-600">
                        {WEEKDAY_LABELS[index]}
                        <div className="font-normal text-gray-400">
                          {dateKey.slice(5)}
                        </div>
                      </th>
                      {MEAL_TIMINGS.map((mealTiming) => {
                        const cell = cellMap.get(cellKey(dateKey, mealTiming));
                        return (
                          <td
                            key={mealTiming}
                            className="min-h-11 border-b border-l border-orange-50 p-1 align-top"
                          >
                            <button
                              type="button"
                              onClick={() => openEdit(dateKey, mealTiming)}
                              className="min-h-11 w-full space-y-1 rounded-lg p-1.5 text-left transition hover:bg-orange-50 active:scale-[0.98]"
                            >
                              {cell?.plan && (
                                <p className="truncate text-xs text-gray-400">
                                  {cell.plan.menuName}
                                </p>
                              )}
                              {cell?.logs.map((log) => (
                                <p
                                  key={log.id}
                                  className="truncate text-xs font-medium text-gray-800"
                                >
                                  {log.menuName}
                                  {log.comment && (
                                    <span className="text-gray-500">
                                      （{log.comment}）
                                    </span>
                                  )}
                                </p>
                              ))}
                              {cell?.levels && cell.levels.length > 0 && (
                                <p className="text-xs">
                                  {cell.levels
                                    .map((level) => COMPLETION_LEVEL_META[level].icon)
                                    .join(" ")}
                                </p>
                              )}
                              {!cell?.plan &&
                                (!cell?.logs || cell.logs.length === 0) && (
                                  <p className="text-xs text-gray-300">−</p>
                                )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-1 text-lg font-bold text-gray-900">予定を編集</h2>
            <p className="mb-4 text-sm text-gray-500">
              {editingCell.date}（{MEAL_TIMING_LABEL[editingCell.mealTiming]}）
            </p>

            <label
              htmlFor="edit-menu-plan-name"
              className="mb-1 block text-sm font-semibold text-gray-500"
            >
              献立名
            </label>
            <input
              id="edit-menu-plan-name"
              type="text"
              value={editMenuName}
              onChange={(e) => setEditMenuName(e.target.value)}
              placeholder="例：鶏そぼろ丼"
              className="mb-6 min-h-11 w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-base text-gray-800 focus:border-orange-500 focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="min-h-11 flex-1 rounded-xl border-2 border-gray-200 bg-white text-base font-medium text-gray-700 transition active:scale-95"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                className="min-h-11 flex-1 rounded-xl bg-orange-500 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklyMenuScreen;
