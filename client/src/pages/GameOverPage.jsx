import { Navigate } from 'react-router-dom'
import { useGame } from '../context/useGame.js'

function GameOverPage() {
  const { state, actions } = useGame()

  if (state.phase !== 'gameOver') {
    return <Navigate to="/" />
  }

  return (
    <main className="app-shell grid place-items-center">
      <section className="grid w-full max-w-[620px] gap-[22px] rounded-lg border border-slate-200 bg-white p-7">
        <h1 className="m-0 text-center text-3xl font-bold text-gray-900">
          {state.winner ? `${state.winner.name} wins!` : 'Game Over'}
        </h1>
        <div className="grid gap-2">
          {state.players.map((player, index) => (
            <div className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-md border border-gray-200 p-3" key={player.id}>
              <span className="font-extrabold text-gray-500">{index + 1}</span>
              <strong>{player.name}</strong>
              <b className="text-blue-600">{player.score}</b>
            </div>
          ))}
        </div>
        <button type="button" className="primary-button" onClick={actions.leaveRoom}>
          Play Again
        </button>
      </section>
    </main>
  )
}

export default GameOverPage
