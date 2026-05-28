const wordClass = 'min-h-12 rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-[22px] font-extrabold text-gray-900'

function WordDisplay({ phase, hintString, myWord, revealedWord, isDrawing, wordLength }) {
  if (isDrawing && myWord) {
    return (
      <div className={wordClass}>
        Draw: <strong>{myWord.toUpperCase()}</strong>
      </div>
    )
  }

  if (phase === 'roundEnd') {
    return (
      <div className={wordClass}>
        The word was: <strong>{revealedWord.toUpperCase()}</strong>
      </div>
    )
  }

  if (phase === 'drawing') {
    return <div className={`${wordClass} [overflow-wrap:anywhere] tracking-[8px]`}>{hintString || '_ '.repeat(wordLength).trim()}</div>
  }

  return <div className={wordClass}>Pick a word</div>
}

export default WordDisplay
