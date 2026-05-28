function TopBar({ round, totalRounds, timeLeft, drawTime, drawerName, phase }) {
  const progress = drawTime > 0 ? Math.max(0, Math.min(100, (timeLeft / drawTime) * 100)) : 0

  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-lg border border-slate-200 bg-white p-3.5">
      <div className="grid gap-0.5">
        <span className="text-xs font-extrabold uppercase text-gray-500">Round</span>
        <strong className="text-gray-900">
          {round}/{totalRounds}
        </strong>
      </div>
      <div className="grid gap-0.5 text-center">
        <span className="text-xs font-extrabold uppercase text-gray-500">{phase}</span>
        <strong className="text-gray-900">{drawerName ? `${drawerName} is drawing` : 'Waiting'}</strong>
      </div>
      <div className="grid gap-0.5">
        <span className="text-xs font-extrabold uppercase text-gray-500">Time</span>
        <strong className="text-gray-900">{timeLeft}s</strong>
      </div>
      <div className="col-span-full h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full transition-[width] duration-300 ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor: timeLeft < 15 ? '#ef4444' : '#22c55e',
          }}
        />
      </div>
    </header>
  )
}

export default TopBar
