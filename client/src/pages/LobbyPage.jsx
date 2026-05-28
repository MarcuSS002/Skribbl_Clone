import { Navigate } from 'react-router-dom'
import { useGame } from '../context/useGame.js'
import PlayerList from '../components/PlayerList.jsx'

function LobbyPage() {
  const { state, actions } = useGame()

  if (!state.roomId) {
    return <Navigate to="/" />
  }

  const shareLink = `${window.location.origin}/join/${state.roomId}`

  function copyRoomCode() {
    navigator.clipboard?.writeText(state.roomId)
  }

  return (
    <main className="app-shell grid place-items-center">
      <section className="grid w-full max-w-[980px] gap-[18px]">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <span className="text-[13px] font-extrabold uppercase text-gray-500">Room code</span>
            <h1 className="m-0 text-[40px] font-bold text-gray-900">{state.roomId}</h1>
          </div>
          <button type="button" className="secondary-button" onClick={copyRoomCode}>
            Copy
          </button>
        </div>

        {state.error && <div className="toast">{state.error}</div>}

        <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-white min-[781px]:grid-cols-[320px_1fr]">
          <PlayerList players={state.players} drawerId={state.drawerId} myId={state.myId} />

          <aside className="grid content-start gap-[18px] border-t border-gray-200 p-5 min-[781px]:border-l min-[781px]:border-t-0">
            <h2 className="m-0 text-xl font-bold text-gray-900">Settings</h2>
            <dl className="m-0 grid gap-2.5">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Players</dt>
                <dd className="m-0 font-extrabold text-gray-900">
                  {state.players.length}/{state.settings.maxPlayers}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Rounds</dt>
                <dd className="m-0 font-extrabold text-gray-900">{state.settings.rounds}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Draw time</dt>
                <dd className="m-0 font-extrabold text-gray-900">{state.settings.drawTime}s</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Word choices</dt>
                <dd className="m-0 font-extrabold text-gray-900">{state.settings.wordCount}</dd>
              </div>
            </dl>

            <label className="field">
              <span>Share link</span>
              <input readOnly value={shareLink} />
            </label>

            {state.players.length < 2 && <p className="m-0 text-gray-500">Waiting for players...</p>}

            {state.isHost && (
              <button
                type="button"
                className="primary-button"
                disabled={state.players.length < 2}
                onClick={actions.startGame}
              >
                Start Game
              </button>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}

export default LobbyPage
