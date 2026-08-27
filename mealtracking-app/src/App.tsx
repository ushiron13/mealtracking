import { useState } from 'react'
import RecordListScreen from './screens/RecordListScreen'
import RecordInputScreen from './screens/RecordInputScreen'
import { RecorderContext } from './RecorderContext'
import { RECORDER_LABEL } from './labels'
import type { Recorder } from './types'

type Screen = 'list' | 'input'

function App() {
  const [screen, setScreen] = useState<Screen>('list')
  const [recorder, setRecorder] = useState<Recorder>('mother')
  const [editingRecordId, setEditingRecordId] = useState<number | undefined>(
    undefined,
  )

  function goToCreate() {
    setEditingRecordId(undefined)
    setScreen('input')
  }

  function goToEdit(recordId: number) {
    setEditingRecordId(recordId)
    setScreen('input')
  }

  function handleSaved() {
    setEditingRecordId(undefined)
    setScreen('list')
  }

  return (
    <RecorderContext.Provider value={{ recorder, setRecorder }}>
      <div className="flex min-h-svh flex-col bg-orange-50">
        <header className="flex items-center justify-between gap-4 border-b border-orange-100 bg-white px-4 py-3 sm:px-8">
          <span className="text-sm font-semibold text-gray-500">記録者</span>
          <div className="flex gap-2">
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
        </header>

        <div className="flex-1">
          {screen === 'list' ? (
            <RecordListScreen
              onNavigateToInput={goToCreate}
              onEditRecord={goToEdit}
            />
          ) : (
            <RecordInputScreen recordId={editingRecordId} onSaved={handleSaved} />
          )}
        </div>
      </div>
    </RecorderContext.Provider>
  )
}

export default App
