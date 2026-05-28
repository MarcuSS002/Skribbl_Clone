import { Navigate } from 'react-router-dom'
import { useGame } from '../context/useGame.js'
import Canvas from '../components/Canvas.jsx'
import ChatBox from '../components/ChatBox.jsx'
import PlayerList from '../components/PlayerList.jsx'
import Toolbar from '../components/Toolbar.jsx'
import TopBar from '../components/TopBar.jsx'
import WordDisplay from '../components/WordDisplay.jsx'
import WordPicker from '../components/WordPicker.jsx'
import socket from '../socket.js'

function GamePage() {
  const { state } = useGame()

  if (!state.roomId) {
    return <Navigate to="/" />
  }

  return (
    <main className="app-shell grid grid-rows-[auto_auto_1fr] gap-3">
      <TopBar
        round={state.currentRound}
        totalRounds={state.totalRounds}
        timeLeft={state.timeLeft}
        drawTime={state.settings.drawTime}
        drawerName={state.drawerName}
        phase={state.phase}
      />

      {state.notice && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-center font-extrabold text-green-800">
          {state.notice}
        </div>
      )}

      <section className="grid min-h-0 gap-3 min-[1101px]:grid-cols-[240px_minmax(0,1fr)_320px] min-[761px]:max-[1100px]:grid-cols-[220px_minmax(0,1fr)] min-[761px]:max-[1100px]:[&>*:last-child]:col-span-2">
        <PlayerList players={state.players} drawerId={state.drawerId} myId={state.myId} />

        <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(360px,1fr)_auto] gap-3">
          <WordDisplay
            phase={state.phase}
            hintString={state.hintString}
            myWord={state.myWord}
            revealedWord={state.revealedWord}
            isDrawing={state.isDrawing}
            wordLength={state.wordLength}
          />
          <Canvas isDrawing={state.isDrawing && state.phase === 'drawing'} strokes={state.strokes} />
          {state.isDrawing && state.phase === 'drawing' && (
            <Toolbar
              onUndo={() => socket.emit('draw_undo')}
              onClear={() => socket.emit('canvas_clear')}
            />
          )}
        </div>

        <ChatBox />
      </section>

      {state.phase === 'picking' && state.isDrawing && <WordPicker words={state.wordOptions} />}
      {state.phase === 'roundEnd' && (
        <div className="fixed inset-0 grid place-items-center bg-slate-900/35 p-6">
          <div className="grid min-w-[280px] gap-2 rounded-lg bg-white p-6 text-center">
            <span className="font-extrabold uppercase text-gray-500">Round over</span>
            <strong className="text-[32px] text-gray-900">{state.revealedWord.toUpperCase()}</strong>
          </div>
        </div>
      )}
    </main>
  )
}

export default GamePage
