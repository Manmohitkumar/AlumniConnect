type QrPatternProps = {
  size?: number
  className?: string
  seed?: number
}

/** Deterministic decorative QR-style module. Not a scannable code. */
export function QrPattern({ size = 21, className = '', seed = 7 }: QrPatternProps) {
  const cells: Array<{ x: number; y: number }> = []

  const finderBoxes = [
    { x: 0, y: 0 },
    { x: size - 7, y: 0 },
    { x: 0, y: size - 7 },
  ]

  const inFinder = (x: number, y: number) => {
    for (const box of finderBoxes) {
      if (x >= box.x && x < box.x + 7 && y >= box.y && y < box.y + 7) {
        const rx = x - box.x
        const ry = y - box.y
        const ring = rx === 0 || rx === 6 || ry === 0 || ry === 6
        const core = rx >= 2 && rx <= 4 && ry >= 2 && ry <= 4
        return ring || core
      }
    }
    return null
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const finder = inFinder(x, y)
      const on = finder !== null ? finder : ((x * 7 + y * 11 + ((x * y + seed) % 5)) % 3 !== 0)
      if (on) cells.push({ x, y })
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
      role="presentation"
    >
      {cells.map((cell) => (
        <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  )
}
