import { useState } from "react";
import { addMenuLogIfNamed } from "../db";
import { useRecorder } from "../RecorderContext";

interface RecordInputScreenProps {
  onSaved: () => void;
  onCancel: () => void;
}

function RecordInputScreen({ onSaved, onCancel }: RecordInputScreenProps) {
  const { recorder } = useRecorder();

  const [menuName, setMenuName] = useState("");
  const [menuComment, setMenuComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!menuName.trim()) {
      setError("献立名を入力してください");
      return;
    }

    setError(null);
    await addMenuLogIfNamed(menuName, menuComment, recorder, new Date());

    setMenuName("");
    setMenuComment("");
    onSaved();
  }

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">
              献立を記録する
            </h1>
            <p className="text-sm text-orange-700 sm:text-base">
              実際に用意した献立を記録しましょう
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 shrink-0 rounded-xl border-2 border-gray-200 bg-white px-5 text-base font-medium text-gray-700 transition active:scale-95"
          >
            キャンセル
          </button>
        </header>

        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
          <div>
            <label
              htmlFor="menu-name"
              className="mb-2 block text-sm font-semibold text-gray-500"
            >
              献立名
            </label>
            <input
              id="menu-name"
              type="text"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              placeholder="例：鶏と根菜の煮物、にんじん、じゃがいも"
              className="min-h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-base text-gray-800 focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="menu-comment"
              className="mb-2 block text-sm font-semibold text-gray-500"
            >
              感想（任意）
            </label>
            <input
              id="menu-comment"
              type="text"
              value={menuComment}
              onChange={(e) => setMenuComment(e.target.value)}
              placeholder="例：よく食べた、薄味にした"
              className="min-h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-base text-gray-800 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="min-h-11 w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
        >
          保存する
        </button>
      </div>
    </div>
  );
}

export default RecordInputScreen;
