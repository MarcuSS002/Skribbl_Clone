const colors = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2']

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function PlayerList({ players, drawerId, myId }) {
  return (
    <aside className="grid min-w-0 content-start gap-3.5 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="m-0 text-xl font-bold text-gray-900">Players</h2>
      <ul className="m-0 grid list-none gap-2 p-0">
        {players.map((player, index) => (
          <li
            className={`grid grid-cols-[40px_1fr_auto] items-center gap-2.5 rounded-md border p-2 ${
              player.id === myId ? 'border-blue-300 bg-blue-50' : 'border-slate-100'
            }`}
            key={player.id}
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-full text-[13px] font-black text-white"
              style={{ backgroundColor: colors[index % colors.length] }}
            >
              {initials(player.name)}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-gray-900">{player.name}</strong>
              <small className="min-h-4 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-gray-500">
                {player.isHost ? 'Host ' : ''}
                {player.id === drawerId ? 'Drawing ' : ''}
                {player.hasGuessedCorrectly ? 'Guessed' : ''}
              </small>
            </span>
            <b className="text-gray-900">{player.score}</b>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default PlayerList
