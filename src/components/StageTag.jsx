import clsx from 'clsx'

const stageConfig = {
  identified: { label: 'Identified', bg: 'rgba(132,141,154,0.15)', color: '#848d9a' },
  building:   { label: 'Building',   bg: 'rgba(89,187,183,0.15)', color: '#59bbb7' },
  test:       { label: 'Test',       bg: 'rgba(238,108,91,0.15)', color: '#ee6c5b' },
  leverage:   { label: 'Leverage',   bg: 'rgba(73,222,255,0.15)', color: '#49deff' },
  nurture:    { label: 'Nurture',    bg: 'rgba(78,112,248,0.15)', color: '#4e70f8' },
}

export default function StageTag({ stage, size = 'sm' }) {
  const config = stageConfig[stage] || stageConfig.identified
  return (
    <span
      style={{ background: config.bg, color: config.color }}
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
    >
      {config.label}
    </span>
  )
}
