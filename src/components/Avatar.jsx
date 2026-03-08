import clsx from 'clsx'

const colours = ['#59bbb7', '#4e70f8', '#49deff', '#ee6c5b', '#848d9a', '#01514e', '#400a20']

function pickColour(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colours[Math.abs(hash) % colours.length]
}

export default function Avatar({ initials, name, size = 'md' }) {
  const bg = pickColour(name || initials)
  const sizeClass = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' }[size]

  return (
    <div
      className={clsx('flex items-center justify-center rounded-full font-semibold text-white select-none shrink-0', sizeClass)}
      style={{ background: bg, color: bg === '#59bbb7' || bg === '#49deff' ? '#0f1924' : '#fff' }}
    >
      {initials}
    </div>
  )
}
