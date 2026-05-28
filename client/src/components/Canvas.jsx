import { useCallback, useEffect, useRef } from 'react'
import socket from '../socket.js'

function Canvas({ isDrawing, strokes }) {
  const canvasRef = useRef(null)
  const isMouseDown = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const currentStrokeColor = useRef('#000000')
  const currentStrokeSize = useRef(4)
  const remoteStroke = useRef({ color: '#000000', size: 4 })

  function getPointer(event) {
    return event.touches ? event.touches[0] : event
  }

  function getNormalized(event) {
    const pointer = getPointer(event)
    const rect = canvasRef.current.getBoundingClientRect()

    return {
      x: Math.max(0, Math.min(1, (pointer.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (pointer.clientY - rect.top) / rect.height)),
    }
  }

  const getPixel = useCallback((nx, ny) => {
    const canvas = canvasRef.current

    return {
      x: nx * canvas.width,
      y: ny * canvas.height,
    }
  }, [])

  const prepareContext = useCallback((color, size) => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    return ctx
  }, [])

  const drawDot = useCallback((x, y, color = currentStrokeColor.current, size = currentStrokeSize.current) => {
    const ctx = prepareContext(color, size)
    const point = getPixel(x, y)
    ctx.beginPath()
    ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2)
    ctx.fill()
  }, [getPixel, prepareContext])

  const drawLine = useCallback((x1, y1, x2, y2, color = currentStrokeColor.current, size = currentStrokeSize.current) => {
    const ctx = prepareContext(color, size)
    const p1 = getPixel(x1, y1)
    const p2 = getPixel(x2, y2)
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
  }, [getPixel, prepareContext])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const replay = useCallback((nextStrokes) => {
    clearCanvas()

    nextStrokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) {
        return
      }

      drawDot(stroke.points[0].x, stroke.points[0].y, stroke.color, stroke.size)
      for (let index = 1; index < stroke.points.length; index += 1) {
        const previous = stroke.points[index - 1]
        const point = stroke.points[index]
        drawLine(previous.x, previous.y, point.x, point.y, stroke.color, stroke.size)
      }
    })
  }, [clearCanvas, drawDot, drawLine])

  function startDraw(event) {
    if (!isDrawing) {
      return
    }

    event.preventDefault()
    isMouseDown.current = true
    const point = getNormalized(event)
    lastPos.current = point
    drawDot(point.x, point.y)
    socket.emit('draw_start', {
      x: point.x,
      y: point.y,
      color: currentStrokeColor.current,
      size: currentStrokeSize.current,
    })
  }

  function moveDraw(event) {
    if (!isDrawing || !isMouseDown.current) {
      return
    }

    event.preventDefault()
    const point = getNormalized(event)
    drawLine(lastPos.current.x, lastPos.current.y, point.x, point.y)
    lastPos.current = point
    socket.emit('draw_move', point)
  }

  function endDraw() {
    if (!isMouseDown.current) {
      return
    }

    isMouseDown.current = false
    socket.emit('draw_end')
  }

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = 800
    canvas.height = 600

    function handleBrushChange(event) {
      currentStrokeColor.current = event.detail.color
      currentStrokeSize.current = event.detail.size
    }

    function handleDrawData(data) {
      if (data.type === 'start') {
        remoteStroke.current = { color: data.color, size: data.size }
        drawDot(data.x, data.y, data.color, data.size)
      }

      if (data.type === 'move') {
        const previous = lastPos.current
        drawLine(previous.x, previous.y, data.x, data.y, remoteStroke.current.color, remoteStroke.current.size)
      }

      if (data.x !== undefined && data.y !== undefined) {
        lastPos.current = { x: data.x, y: data.y }
      }
    }

    function handleCanvasCleared() {
      clearCanvas()
    }

    function handleCanvasReplay({ strokes: nextStrokes }) {
      replay(nextStrokes || [])
    }

    function handleResize() {
      socket.emit('request_canvas')
    }

    window.addEventListener('brush-change', handleBrushChange)
    window.addEventListener('resize', handleResize)
    socket.on('draw_data', handleDrawData)
    socket.on('canvas_cleared', handleCanvasCleared)
    socket.on('canvas_replay', handleCanvasReplay)
    socket.emit('request_canvas')

    return () => {
      window.removeEventListener('brush-change', handleBrushChange)
      window.removeEventListener('resize', handleResize)
      socket.off('draw_data', handleDrawData)
      socket.off('canvas_cleared', handleCanvasCleared)
      socket.off('canvas_replay', handleCanvasReplay)
    }
  }, [clearCanvas, drawDot, drawLine, replay])

  useEffect(() => {
    replay(strokes || [])
  }, [replay, strokes])

  return (
    <div className="min-h-[360px] touch-none overflow-hidden rounded-lg border border-slate-200 bg-white">
      <canvas
        className="block h-full min-h-[360px] w-full"
        ref={canvasRef}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />
    </div>
  )
}

export default Canvas
