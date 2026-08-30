export interface PiyologDayMentions {
  date: string;
  foodMentions: string[];
}

const DATE_HEADER_RE = /^(\d{4})\/(\d{1,2})\/(\d{1,2})\(.+?\)/;
const MEAL_LINE_RE = /^\d{1,2}:\d{2}\s+離乳食\s+(.+)$/;

/**
 * ぴよログの「記録の出力」テキスト（ダミー形式、inventory_menu_claude_code_instructions.md ステップ5参照）を
 * 日付ごとの食材名候補にパースする。実データのフォーマットが未確認のため、
 * ダミー形式に基づく暫定実装（ステップ6で実データに合わせて精緻化する想定）。
 *
 * 想定フォーマット：
 * 2026/8/25(火) 子供の名前 (0歳8か月10日)
 * 07:30 離乳食 かぼちゃ粥 にんじん
 */
export function parsePiyologText(text: string): PiyologDayMentions[] {
  const days = new Map<string, string[]>();
  let currentDate: string | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const dateMatch = line.match(DATE_HEADER_RE);
    if (dateMatch) {
      const [, yyyy, mm, dd] = dateMatch;
      currentDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      if (!days.has(currentDate)) days.set(currentDate, []);
      continue;
    }

    const mealMatch = line.match(MEAL_LINE_RE);
    if (mealMatch && currentDate) {
      const foodNames = mealMatch[1].split(/\s+/).filter(Boolean);
      days.get(currentDate)!.push(...foodNames);
    }
  }

  return [...days.entries()].map(([date, foodMentions]) => ({ date, foodMentions }));
}
