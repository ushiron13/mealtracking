import { useEffect, useState } from 'react'
import RecordInputScreen from './screens/RecordInputScreen'
import WeeklyMenuScreen from './screens/WeeklyMenuScreen'
import InventoryListScreen from './screens/InventoryListScreen'
import MenuSuggestionScreen from './screens/MenuSuggestionScreen'
import { seedInitialFoodsIfEmpty } from './db'
import { RecorderContext } from './RecorderContext'
import { RECORDER_LABEL } from './labels'
import type { Recorder } from './types'

type Screen = 'weeklyMenu' | 'input' | 'inventory' | 'suggestion'

const NAV_TABS: { screen: Screen; label: string }[] = [
  { screen: 'weeklyMenu', label: '週間献立表' },
  { screen: 'inventory', label: '在庫一覧' },
  { screen: 'suggestion', label: '献立提案' },
]

function App() {
  const [screen, setScreen] = useState<Screen>('weeklyMenu')
  const [recorder, setRecorder] = useState<Recorder>('mother')

  useEffect(() => {
    seedInitialFoodsIfEmpty()
  }, [])

  function goToInput() {
    setScreen('input')
  }

  function goToWeeklyMenu() {
    setScreen('weeklyMenu')
  }

  return (
    <RecorderContext.Provider value={{ recorder, setRecorder }}>
      <div className="flex min-h-svh flex-col bg-orange-50">
        <header className="flex flex-col gap-3 border-b border-orange-100 bg-white px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <nav className="flex gap-2">
              {NAV_TABS.map((tab) => (
                <button
                  key={tab.screen}
                  type="button"
                  onClick={() => setScreen(tab.screen)}
                  aria-pressed={screen === tab.screen}
                  className={`min-h-11 rounded-xl border-2 px-4 text-sm font-medium transition active:scale-95 ${
                    screen === tab.screen
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500">記録者</span>
              {(Object.keys(RECORDER_LABEL) as Recorder[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecorder(r)}
                  aria-pressed={recorder === r}
                  className={`min-h-11 min-w-11 rounded-xl border-2 px-4 py-2 text-sm font-medium transition active:scale-95 ${
                    recorder === r
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {RECORDER_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1">
          {screen === 'input' && (
            <RecordInputScreen onSaved={goToWeeklyMenu} onCancel={goToWeeklyMenu} />
          )}
          {screen === 'weeklyMenu' && <WeeklyMenuScreen onNavigateToInput={goToInput} />}
          {screen === 'inventory' && <InventoryListScreen />}
          {screen === 'suggestion' && <MenuSuggestionScreen />}
        </div>
      </div>
    </RecorderContext.Provider>
  )
}

export default App
