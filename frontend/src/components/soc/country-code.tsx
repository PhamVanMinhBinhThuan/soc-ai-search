import cnFlag from 'flag-icons/flags/4x3/cn.svg'
import deFlag from 'flag-icons/flags/4x3/de.svg'
import ruFlag from 'flag-icons/flags/4x3/ru.svg'
import sgFlag from 'flag-icons/flags/4x3/sg.svg'
import usFlag from 'flag-icons/flags/4x3/us.svg'
import vnFlag from 'flag-icons/flags/4x3/vn.svg'

const flagByCountryCode: Record<string, string> = {
  CN: cnFlag,
  DE: deFlag,
  RU: ruFlag,
  SG: sgFlag,
  US: usFlag,
  VN: vnFlag,
}

export function CountryCode({ code }: { code: string }) {
  const normalizedCode = code.trim().toUpperCase()
  const flag = flagByCountryCode[normalizedCode]

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      aria-label={`Country code ${normalizedCode}`}
    >
      {flag ? (
        <img
          aria-hidden="true"
          src={flag}
          alt=""
          className="h-3 w-4 rounded-[2px] object-cover shadow-sm ring-1 ring-white/10"
        />
      ) : null}
      <span className="font-mono text-xs">{normalizedCode || 'N/A'}</span>
    </span>
  )
}
