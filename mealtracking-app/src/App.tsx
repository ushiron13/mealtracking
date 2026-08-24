import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-svh bg-orange-50 flex flex-col items-center px-4 py-8 sm:px-8">
      <div className="w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">
            離乳食トラッキング
          </h1>
          <p className="text-sm text-orange-700 sm:text-base">
            プロジェクトセットアップ動作確認ページ
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-orange-100 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            セットアップ確認
          </h2>
          <ul className="space-y-2 text-sm text-gray-600 sm:text-base">
            <li>✅ Vite + React + TypeScript</li>
            <li>✅ Tailwind CSS</li>
            <li>✅ Dexie.js (IndexedDB)</li>
            <li>✅ vite-plugin-pwa (manifest / icons)</li>
          </ul>

          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            className="w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-medium text-white shadow-sm transition active:scale-95 active:bg-orange-600 sm:w-auto sm:px-6"
          >
            カウント: {count}
          </button>
        </section>
      </div>
    </div>
  )
}

export default App
