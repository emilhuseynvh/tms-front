/** Azərbaycan standart vaxtı (UTC+4, DST yoxdur) — IANA: Asia/Baku */

export const BAKU_TZ = 'Asia/Baku'

/**
 * API vaxtını düzgün instanta çevirir. Server çox vaxt UTC verir, amma JSON-da "Z" olmaya bilər;
 * brauzer isə belə sətirləri lokal saat kimi oxuyur → AZ üçün ~4 saat səhv "əvvəl" göstərir.
 */
export function parseServerTimestamp(raw) {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number' && !Number.isNaN(raw)) return new Date(raw)
  const s = String(raw).trim()
  if (!s) return null

  const hasZone =
    /[zZ]$/.test(s) ||
    /[+-]\d{2}:\d{2}(:\d{2})?$/.test(s) ||
    /[+-]\d{4}$/.test(s)

  if (hasZone) {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00.000Z`)
    return isNaN(d.getTime()) ? null : d
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    const d = new Date(`${s}Z`)
    return isNaN(d.getTime()) ? null : d
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    const d = new Date(`${s.replace(' ', 'T')}Z`)
    return isNaN(d.getTime()) ? null : d
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
const MONTHS_LONG = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']

/**
 * İnstant üçün Bakı təqvimində il/ay/gün və saat hissələri
 */
export function getBakuParts(date) {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: BAKU_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    dtf.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  }
}

export function formatShortDateTimeBaku(date) {
  const p = getBakuParts(date)
  const mo = MONTHS_SHORT[p.month - 1]
  return `${p.day} ${mo} ${p.year} ${p.hour}:${p.minute}`
}

/** Tapşırıq cədvəlində tarix sütunları — məs: "19 Mar 20:16" */
export function formatInlineTableDate(raw) {
  const date = parseServerTimestamp(raw)
  if (!date) return '-'
  const p = getBakuParts(date)
  const mo = MONTHS_SHORT[p.month - 1]
  return `${p.day} ${mo} ${p.hour}:${p.minute}`
}

/**
 * @param {'default' | 'short' | 'detail'} style — default: tam sözlər; short: bildiriş; detail: tapşırıq cədvəli
 */
export function formatRelativeTimeAgo(raw, style = 'default') {
  const date = parseServerTimestamp(raw)
  if (!date) return '-'

  const now = Date.now()
  let diff = now - date.getTime()
  if (diff < 0) diff = 0

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (style === 'short') {
    if (seconds < 60) return 'İndicə'
    if (minutes < 60) return `${minutes} dəq`
    if (hours < 24) return `${hours} saat`
    if (days < 7) return `${days} gün`
    return date.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', timeZone: BAKU_TZ })
  }

  if (style === 'detail') {
    if (seconds < 60) return 'İndicə'
    if (minutes < 60) return `${minutes} dəq əvvəl`
    if (hours < 24) {
      const remainingMinutes = minutes % 60
      if (remainingMinutes === 0) return `${hours} saat əvvəl`
      return `${hours}s ${remainingMinutes}dəq`
    }
    if (days < 7) {
      const remainingHours = hours % 24
      if (remainingHours === 0) return `${days} gün əvvəl`
      return `${days}g ${remainingHours}s`
    }
    if (days < 30) return `${Math.floor(days / 7)} həftə əvvəl`
    return date.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', timeZone: BAKU_TZ })
  }

  if (seconds < 60) return 'İndicə'
  if (minutes < 60) return `${minutes} dəqiqə əvvəl`
  if (hours < 24) return `${hours} saat əvvəl`
  if (days < 7) return `${days} gün əvvəl`

  return formatShortDateTimeBaku(date)
}

export function formatFullDateTimeBaku(date) {
  const p = getBakuParts(date)
  const mo = MONTHS_LONG[p.month - 1]
  return `${p.day} ${mo} ${p.year}, ${p.hour}:${p.minute}:${p.second}`
}

/** Cari anın Bakı təqviminə görə YYYY-MM-DD */
export function todayYmdInBaku() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BAKU_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** İnstant üçün Bakı təqvimində YYYY-MM-DD */
export function ymdInBakuFromDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BAKU_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * Filtr dəyərini Bakı təqvimində YYYY-MM-DD formatına gətirir.
 */
export function normalizeFilterYmd(value) {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  if (!s || s === 'undefined') return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const date = parseServerTimestamp(s)
  if (!date) return ''
  return ymdInBakuFromDate(date)
}

/**
 * Filtr üçün: seçilmiş Bakı təqvim günü (YYYY-MM-DD) → UTC ISO sərhədləri
 */
export function bakuYmdToUtcRange(ymd) {
  const normalized = normalizeFilterYmd(ymd)
  if (!normalized) return null
  return {
    start: new Date(`${normalized}T00:00:00.000+04:00`).toISOString(),
    end: new Date(`${normalized}T23:59:59.999+04:00`).toISOString(),
  }
}

/**
 * API filtri — Bakı təqvim günü (YYYY-MM-DD).
 * Backend start/end of day-ı özü hesablayır (URL-də ISO + simvol problemi olmasın).
 */
export function filterStartDateParam(ymd) {
  return normalizeFilterYmd(ymd)
}

export function filterEndDateParam(ymd) {
  return normalizeFilterYmd(ymd)
}
