export default function ResizeHandle({ width, onResize, onStart, onEnd, minWidth = 60 }) {
  const handleMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = width
    onStart?.()

    const onMove = (ev) => onResize(Math.max(minWidth, startWidth + (ev.clientX - startX)))
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      onEnd?.()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <span
      onMouseDown={handleMouseDown}
      draggable={false}
      onDragStart={e => e.preventDefault()}
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-sky-400/70 active:bg-sky-500 z-10"
    />
  )
}
