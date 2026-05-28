import { useGame } from '../context/useGame.js'

function WordPicker({ words }) {
  const { actions } = useGame()

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-slate-900/45 p-6">
      <div className="grid w-full max-w-[520px] gap-[18px] rounded-lg bg-white p-6">
        <h2 className="m-0 text-center text-xl font-bold text-gray-900">Pick a word to draw:</h2>
        <div className="grid gap-2.5">
          {words.map((word) => (
            <button type="button" className="primary-button" key={word} onClick={() => actions.chooseWord(word)}>
              {word}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WordPicker
