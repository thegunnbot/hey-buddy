export default function HealthScore({ score, size = 'md', showBreakdown = false, components = null }) {
  if (score == null) return null

  const colour = score >= 65 ? '#59bbb7' : score >= 35 ? '#f59e0b' : '#ee6c5b'
  const label = score >= 65 ? 'Strong' : score >= 35 ? 'At risk' : 'Critical'

  const radius = size === 'sm' ? 14 : 18
  const stroke = size === 'sm' ? 3 : 4
  const dim = (radius + stroke) * 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
        {/* Background ring */}
        <svg width={dim} height={dim} className="absolute rotate-[-90deg]">
          <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="#e0e0e0" strokeWidth={stroke} />
          <circle
            cx={dim / 2} cy={dim / 2} r={radius} fill="none"
            stroke={colour} strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <span className={`font-bold relative z-10 ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`} style={{ color: colour }}>
          {score}
        </span>
      </div>
      {size !== 'sm' && (
        <span className="text-[10px] font-medium" style={{ color: colour }}>{label}</span>
      )}

      {showBreakdown && components && (
        <div className="mt-2 w-full space-y-1.5">
          {[
            { label: 'Recency', value: components.recency_score, max: 40 },
            { label: 'Profile', value: components.profile_score, max: 25 },
            { label: 'Momentum', value: components.momentum_score, max: 20 },
            { label: 'Stage', value: components.stage_score, max: 15 },
          ].map(({ label, value, max }) => (
            <div key={label}>
              <div className="flex justify-between text-[10px] mb-0.5" style={{ color: '#848d9a' }}>
                <span>{label}</span>
                <span>{value ?? 0}/{max}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: '#e0e0e0' }}>
                <div
                  className="h-1 rounded-full transition-all"
                  style={{ width: `${((value ?? 0) / max) * 100}%`, background: colour }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
