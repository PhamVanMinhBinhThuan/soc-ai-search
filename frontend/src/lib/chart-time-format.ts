function parseDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function uppercaseMeridiem(value: string) {
  return value.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase())
}

function formatLocalTimeOnly(value: unknown) {
  const date = parseDate(value)
  if (!date) return String(value ?? "")

  return uppercaseMeridiem(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: true,
    }).format(date),
  )
}

function formatLocalDateTimeTick(value: unknown) {
  const date = parseDate(value)
  if (!date) return String(value ?? "")

  return uppercaseMeridiem(
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      hour: "numeric",
      hour12: true,
    }).format(date),
  )
}

export function createLocalChartTickFormatter<T extends object>(
  data: T[],
  key: keyof T,
) {
  const timestamps = data
    .map((item) => parseDate(item[key])?.getTime())
    .filter((value): value is number => typeof value === "number")

  if (timestamps.length < 2) {
    return formatLocalTimeOnly
  }

  const rangeMs = Math.max(...timestamps) - Math.min(...timestamps)
  const showDate = rangeMs > 48 * 60 * 60 * 1000

  return showDate ? formatLocalDateTimeTick : formatLocalTimeOnly
}

export function formatLocalChartTooltipLabel(value: unknown) {
  const date = parseDate(value)
  if (!date) return String(value ?? "")

  return uppercaseMeridiem(
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date),
  )
}
