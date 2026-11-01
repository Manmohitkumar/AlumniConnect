type CampusNode = {
  num: string
  cx: number
  cy: number
  w: number
  h: number
  top: string
  left: string
  right: string
  glow: string
}

const nodes: CampusNode[] = [
  { num: '01', cx: 230, cy: 100, w: 44, h: 30, top: '#F2D492', left: '#F29559', right: '#324555', glow: '#F29559' },
  { num: '04', cx: 120, cy: 165, w: 40, h: 28, top: '#D6D0B7', left: '#B8B08D', right: '#3D5365', glow: '#B8B08D' },
  { num: '03', cx: 340, cy: 165, w: 40, h: 28, top: '#F7D7AC', left: '#F2D492', right: '#2D3F4F', glow: '#F2D492' },
  { num: '02', cx: 135, cy: 300, w: 40, h: 28, top: '#F7D7AC', left: '#F29559', right: '#B8B08D', glow: '#F29559' },
  { num: '05', cx: 325, cy: 300, w: 40, h: 28, top: '#F7D7AC', left: '#F2D492', right: '#324555', glow: '#F2D492' },
]

const lobby = {
  num: 'AC',
  cx: 230,
  cy: 220,
  w: 50,
  h: 36,
  top: '#F7D7AC',
  left: '#F29559',
  right: '#3D5365',
  glow: '#F29559',
}

function Cube({ node, id }: { node: CampusNode; id: string }) {
  const { cx, cy, w, h } = node
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={node.top} />
          <stop offset="100%" stopColor={node.top} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`${id}-left`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={node.left} />
          <stop offset="100%" stopColor={node.left} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${id}-right`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={node.right} />
          <stop offset="100%" stopColor={node.right} stopOpacity="0.7" />
        </linearGradient>
      </defs>

      <ellipse cx={cx} cy={cy + h + 8} rx={w * 0.95} ry={9} fill={node.glow} opacity="0.2" />

      <polygon
        points={`${cx - w},${cy} ${cx},${cy - w / 2} ${cx + w},${cy} ${cx},${cy + w / 2}`}
        fill={`url(#${id}-top)`}
      />
      <polygon
        points={`${cx - w},${cy} ${cx},${cy + w / 2} ${cx},${cy + w / 2 + h} ${cx - w},${cy + h}`}
        fill={`url(#${id}-left)`}
      />
      <polygon
        points={`${cx + w},${cy} ${cx},${cy + w / 2} ${cx},${cy + w / 2 + h} ${cx + w},${cy + h}`}
        fill={`url(#${id}-right)`}
      />
      <polyline
        points={`${cx - w},${cy} ${cx},${cy - w / 2} ${cx + w},${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.8"
      />
      <line
        x1={cx}
        y1={cy + w / 2}
        x2={cx}
        y2={cy + w / 2 + h}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.8"
      />

      <circle cx={cx} cy={cy - w / 2 - 15} r="10.5" fill="#202C39" stroke={node.glow} strokeWidth="1" opacity="0.95" />
      <text
        x={cx}
        y={cy - w / 2 - 15}
        textAnchor="middle"
        dominantBaseline="central"
        fill={node.glow}
        fontSize="8"
        fontWeight="700"
        letterSpacing="0.4"
      >
        {node.num}
      </text>
    </g>
  )
}

export function IsoCampus() {
  return (
    <svg
      viewBox="0 0 460 380"
      className="h-auto w-full"
      role="img"
      aria-label="Isometric map of the AlumniConnect virtual campus: a central lobby surrounded by five room entrances"
    >
      <defs>
        <radialGradient id="campus-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F29559" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#B8B08D" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#202C39" stopOpacity="0" />
        </radialGradient>
        <filter id="campus-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <ellipse cx="230" cy="285" rx="215" ry="105" fill="url(#campus-floor)" />

      <g stroke="rgba(242,149,89,0.2)" strokeWidth="1" strokeDasharray="3 7" fill="none" strokeLinecap="round">
        <line x1="230" y1="248" x2="230" y2="128" />
        <line x1="196" y1="235" x2="132" y2="188" />
        <line x1="264" y1="235" x2="328" y2="188" />
        <line x1="196" y1="262" x2="148" y2="288" />
        <line x1="264" y1="262" x2="312" y2="288" />
      </g>

      {nodes
        .slice()
        .sort((a, b) => a.cy - b.cy)
        .map((node) => (
          <Cube key={node.num} node={node} id={`node-${node.num}`} />
        ))}

      <Cube node={lobby} id="node-lobby" />
      <circle cx="230" cy="180" r="4" fill="#F2D492" />
      <circle cx="230" cy="180" r="4" fill="none" stroke="#F2D492" strokeWidth="1">
        <animate attributeName="r" values="4;16" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0" dur="2.8s" repeatCount="indefinite" />
      </circle>

      <g opacity="0.5" filter="url(#campus-blur)">
        <ellipse cx="230" cy="330" rx="150" ry="18" fill="#F2D492" opacity="0.14" />
      </g>
    </svg>
  )
}
