import clsx from 'clsx'

const config = {
  green: { dot: '#59bbb7', label: 'On track',  text: '#59bbb7' },
  amber: { dot: '#f5a623', label: 'Due soon',  text: '#f5a623' },
  red:   { dot: '#ee6c5b', label: 'Overdue',   text: '#ee6c5b' },
}

export default function HealthDot({ health, showLabel = false }) {
  const c = config[health] || config.green
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.dot }} />
      {showLabel && <span className="text-xs font-medium" style={{ color: c.text }}>{c.label}</span>}
    </span>
  )
}
