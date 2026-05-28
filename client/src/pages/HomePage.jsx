import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../context/useGame.js'

function HomePage() {
  const { joinRoomId } = useParams()
  const { state, actions } = useGame()
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState(() => joinRoomId || '')
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(state.settings)

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: Number(value) }))
  }

  function handleCreate(event) {
    event.preventDefault()
    actions.clearError()
    actions.createRoom(name.trim(), settings)
  }

  function handleJoin(event) {
    event.preventDefault()
    actions.clearError()
    actions.joinRoom(roomCode.trim(), name.trim())
  }

  const canSubmit = name.trim().length > 0

  return (
    <main className="app-shell grid place-items-center">
      <section className="grid w-full max-w-[560px] gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(31,41,55,0.12)] sm:p-7">
        <div className="grid gap-1.5 text-center">
          <h1 className="m-0 text-[34px] font-bold leading-none text-gray-900 sm:text-[44px]">Skribbl Clone</h1>
          <p className="m-0 text-gray-500">Draw fast. Guess faster.</p>
        </div>

        {state.error && <div className="toast">{state.error}</div>}

        <label className="field">
          <span>Name</span>
          <input
            value={name}
            maxLength={20}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            required
          />
        </label>

        <form className="grid gap-3.5" onSubmit={handleCreate}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowSettings((value) => !value)}
          >
            Create Room
          </button>

          {showSettings && (
            <div className="grid gap-3.5 rounded-lg border border-gray-200 p-3.5 sm:grid-cols-2 [&>button]:sm:col-span-2">
              <label className="field">
                <span>Max players</span>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={settings.maxPlayers}
                  onChange={(event) => updateSetting('maxPlayers', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Rounds</span>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={settings.rounds}
                  onChange={(event) => updateSetting('rounds', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Draw time</span>
                <input
                  type="number"
                  min="15"
                  max="240"
                  value={settings.drawTime}
                  onChange={(event) => updateSetting('drawTime', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Word choices</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.wordCount}
                  onChange={(event) => updateSetting('wordCount', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Hints</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={settings.hints}
                  onChange={(event) => updateSetting('hints', event.target.value)}
                />
              </label>
              <button type="submit" className="primary-button" disabled={!canSubmit}>
                Start a Room
              </button>
            </div>
          )}
        </form>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-extrabold text-gray-500 before:h-px before:bg-gray-200 before:content-[''] after:h-px after:bg-gray-200 after:content-['']">OR</div>

        <form className="grid gap-3.5" onSubmit={handleJoin}>
          <label className="field">
            <span>Room code</span>
            <input
              value={roomCode}
              maxLength={12}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
            />
          </label>
          <button
            type="submit"
            className="primary-button"
            disabled={!canSubmit || roomCode.trim().length === 0}
          >
            Join Room
          </button>
        </form>
      </section>
    </main>
  )
}

export default HomePage
