import { useEffect, useRef, useState } from 'react'
import { useGame } from '../context/useGame.js'

const messageStyles = {
  chat: 'rounded-md bg-gray-100 px-2.5 py-2 text-sm text-gray-700',
  guess: 'rounded-md bg-gray-100 px-2.5 py-2 text-sm italic text-gray-700',
  system: 'rounded-md bg-green-100 px-2.5 py-2 text-sm font-extrabold text-green-800',
}

function ChatBox() {
  const { state, actions } = useGame()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const me = state.players.find((player) => player.id === state.myId)
  const hasGuessedCorrectly = Boolean(me && me.hasGuessedCorrectly)
  const blocked = state.isDrawing || hasGuessedCorrectly

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages])

  function handleSubmit(event) {
    event.preventDefault()
    const text = input.trim()

    if (!text) {
      return
    }

    actions.sendMessage(text)
    setInput('')
  }

  return (
    <section className="grid min-h-0 grid-rows-[minmax(240px,1fr)_auto] overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-2 overflow-y-auto p-3.5">
        {state.messages.map((message) => (
          <p className={messageStyles[message.type] || messageStyles.chat} key={message.id}>
            <strong>{message.playerName ? `${message.playerName}: ` : ''}</strong>
            {message.text}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="grid grid-cols-[1fr_auto] gap-2 border-t border-gray-200 p-2.5" onSubmit={handleSubmit}>
        <input
          className="min-h-[42px] min-w-0 rounded-md border border-gray-300 px-3"
          value={input}
          disabled={blocked}
          onChange={(event) => setInput(event.target.value)}
          placeholder={hasGuessedCorrectly ? 'You already guessed it!' : 'Type your guess...'}
        />
        <button type="submit" className="primary-button" disabled={blocked}>
          Send
        </button>
      </form>
    </section>
  )
}

export default ChatBox
