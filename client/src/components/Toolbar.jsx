import { useState } from 'react'

const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280']
const SIZES = [2, 4, 8, 16]

function Toolbar({ onUndo, onClear }) {
  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(4)

  function pickColor(nextColor) {
    setColor(nextColor)
    window.dispatchEvent(new CustomEvent('brush-change', { detail: { color: nextColor, size } }))
  }

  function pickSize(nextSize) {
    setSize(nextSize)
    window.dispatchEvent(new CustomEvent('brush-change', { detail: { color, size: nextSize } }))
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap gap-2">
        {COLORS.map((nextColor) => (
          <button
            type="button"
            key={nextColor}
            title={nextColor}
            className={`h-7 w-7 rounded-full border-2 border-gray-300 ${
              nextColor === color ? 'outline-3 outline-offset-2 outline-blue-300' : ''
            }`}
            style={{ backgroundColor: nextColor }}
            onClick={() => pickColor(nextColor)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {SIZES.map((nextSize) => (
          <button
            type="button"
            key={nextSize}
            className={`h-[30px] min-w-[34px] rounded-md border border-gray-300 bg-white font-extrabold text-gray-900 ${
              nextSize === size ? 'outline-3 outline-offset-2 outline-blue-300' : ''
            }`}
            onClick={() => pickSize(nextSize)}
          >
            {nextSize}
          </button>
        ))}
      </div>
      <button type="button" className="secondary-button" onClick={onUndo} title="Undo">
        Undo
      </button>
      <button type="button" className="danger-button" onClick={onClear} title="Clear">
        Clear
      </button>
    </div>
  )
}

export default Toolbar
