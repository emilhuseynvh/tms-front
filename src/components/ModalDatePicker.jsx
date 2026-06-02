import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useFlippedDropdownPosition } from '../hooks/useFlippedDropdownPosition'
import { todayYmdInBaku, ymdInBakuFromDate, getBakuParts } from '../utils/bakuTime'

/** Tapşırıq modalındakı təqvim UI-si; `dateOnly` + `disablePastDays={false}` filtrlər üçün */
const ModalDatePicker = ({
  value,
  onChange,
  placeholder,
  dateOnly = false,
  disablePastDays = true,
  triggerClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const now = new Date()
  const [selectedTime, setSelectedTime] = useState({
    hours: String(now.getHours()).padStart(2, '0'),
    minutes: String(now.getMinutes()).padStart(2, '0'),
  })
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  const isMobileView =
    typeof window !== 'undefined' && window.innerWidth < 640
  const panelWidth = isMobileView ? window.innerWidth - 32 : 520
  const panelHeight = isMobileView ? 500 : 420

  const position = useFlippedDropdownPosition({
    isOpen,
    anchorRef: triggerRef,
    dropdownRef,
    estimatedHeight: panelHeight,
    width: panelWidth,
    viewportPadding: 16,
    fixedLeft: isMobileView ? 16 : undefined,
    deps: [isMobileView],
  })

  useEffect(() => {
    if (value) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
        const ymd = String(value).trim()
        const date = new Date(`${ymd}T12:00:00+04:00`)
        if (!isNaN(date.getTime())) {
          setSelectedDate(date)
          setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
          setSelectedTime({
            hours: '00',
            minutes: '00',
          })
        }
      } else {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          setSelectedDate(date)
          setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
          setSelectedTime({
            hours: String(date.getHours()).padStart(2, '0'),
            minutes: String(date.getMinutes()).padStart(2, '0'),
          })
        }
      }
    } else {
      setSelectedDate(null)
      const currentTime = new Date()
      setSelectedTime({
        hours: String(currentTime.getHours()).padStart(2, '0'),
        minutes: String(currentTime.getMinutes()).padStart(2, '0'),
      })
    }
  }, [value])

  useEffect(() => {
    if (isOpen && !value) {
      const currentTime = new Date()
      setSelectedTime({
        hours: String(currentTime.getHours()).padStart(2, '0'),
        minutes: String(currentTime.getMinutes()).padStart(2, '0'),
      })
    }
  }, [isOpen, value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const getQuickOptions = () => {
    const now = new Date()
    const ymdToday = todayYmdInBaku()
    const today = new Date(`${ymdToday}T12:00:00+04:00`)

    const addDays = (date, days) => {
      const result = new Date(date)
      result.setDate(result.getDate() + days)
      return result
    }

    const getNextWeekday = (dayOfWeek) => {
      const result = new Date(today)
      const currentDay = result.getDay()
      const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7
      result.setDate(result.getDate() + daysUntil)
      return result
    }

    const formatShortDate = (date) => {
      const days = ['Baz', 'B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən']
      const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24))
      if (diffDays < 7) {
        return days[date.getDay()]
      }
      return `${date.getDate()} ${['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'][date.getMonth()]}`
    }

    const laterToday = new Date(now)
    laterToday.setHours(20, 16, 0, 0)
    if (laterToday <= now) {
      laterToday.setDate(laterToday.getDate() + 1)
    }

    return [
      { label: 'Bugün', date: today, shortDate: formatShortDate(today) },
      { label: 'Sonra', date: laterToday, shortDate: `${laterToday.getHours()}:${String(laterToday.getMinutes()).padStart(2, '0')}` },
      { label: 'Sabah', date: addDays(today, 1), shortDate: formatShortDate(addDays(today, 1)) },
      { label: 'Bu həftə sonu', date: getNextWeekday(6), shortDate: formatShortDate(getNextWeekday(6)) },
      { label: 'Gələn həftə', date: getNextWeekday(1), shortDate: formatShortDate(getNextWeekday(1)) },
      { label: 'Gələn həftə sonu', date: addDays(getNextWeekday(6), 7), shortDate: formatShortDate(addDays(getNextWeekday(6), 7)) },
      { label: '2 həftə', date: addDays(today, 14), shortDate: formatShortDate(addDays(today, 14)) },
      { label: '4 həftə', date: addDays(today, 28), shortDate: formatShortDate(addDays(today, 28)) },
    ]
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    const days = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i),
      })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      })
    }

    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      })
    }

    return days
  }

  const isToday = (date) => {
    if (dateOnly) {
      return ymdInBakuFromDate(date) === todayYmdInBaku()
    }
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isPastDate = (date) => {
    if (dateOnly) {
      return ymdInBakuFromDate(date) < todayYmdInBaku()
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  const isSelected = (date) => {
    if (!selectedDate) return false
    if (dateOnly) {
      return ymdInBakuFromDate(date) === ymdInBakuFromDate(selectedDate)
    }
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const emitValue = (finalDate) => {
    if (!finalDate) return
    if (dateOnly) {
      onChange(ymdInBakuFromDate(finalDate))
    } else {
      const year = finalDate.getFullYear()
      const month = String(finalDate.getMonth() + 1).padStart(2, '0')
      const day = String(finalDate.getDate()).padStart(2, '0')
      const hours = String(finalDate.getHours()).padStart(2, '0')
      const minutes = String(finalDate.getMinutes()).padStart(2, '0')
      const tzOffset = -finalDate.getTimezoneOffset()
      const tzSign = tzOffset >= 0 ? '+' : '-'
      const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0')
      const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0')
      const formatted = `${year}-${month}-${day}T${hours}:${minutes}:00${tzSign}${tzHours}:${tzMins}`
      onChange(formatted)
    }
    setIsOpen(false)
  }

  const applyDate = (date) => {
    if (date) {
      const finalDate = new Date(date)
      if (!dateOnly) {
        finalDate.setHours(parseInt(selectedTime.hours, 10), parseInt(selectedTime.minutes, 10), 0, 0)
      } else {
        finalDate.setHours(0, 0, 0, 0)
      }
      emitValue(finalDate)
    } else {
      setIsOpen(false)
    }
  }

  const handleQuickSelect = (option) => {
    const date = new Date(option.date)
    if (dateOnly) {
      const d = new Date(date.getTime())
      setSelectedDate(d)
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))
      emitValue(d)
      return
    }
    if (option.label === 'Sonra') {
      setSelectedTime({
        hours: String(date.getHours()).padStart(2, '0'),
        minutes: String(date.getMinutes()).padStart(2, '0'),
      })
      date.setHours(date.getHours(), date.getMinutes(), 0, 0)
    } else {
      date.setHours(parseInt(selectedTime.hours, 10), parseInt(selectedTime.minutes, 10), 0, 0)
    }
    setSelectedDate(date)
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    emitValue(date)
  }

  const handleDayClick = (dayInfo) => {
    if (disablePastDays && isPastDate(dayInfo.date)) return
    const date = new Date(dayInfo.date)
    if (dateOnly) {
      const d = new Date(date.getTime())
      if (!dayInfo.isCurrentMonth) {
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))
      }
      emitValue(d)
      return
    }
    date.setHours(parseInt(selectedTime.hours, 10), parseInt(selectedTime.minutes, 10), 0, 0)
    setSelectedDate(date)
    if (!dayInfo.isCurrentMonth) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const handleClear = () => {
    setSelectedDate(null)
    onChange('')
    setIsOpen(false)
  }

  const formatDisplayValue = () => {
    if (!value) return placeholder
    if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
      const ymd = String(value).trim()
      const date = new Date(`${ymd}T12:00:00+04:00`)
      if (isNaN(date.getTime())) return placeholder
      const p = getBakuParts(date)
      const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
      return `${p.day} ${months[p.month - 1]} ${p.year}`
    }
    const date = new Date(value)
    if (isNaN(date.getTime())) return placeholder

    const day = date.getDate()
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
    const month = months[date.getMonth()]
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${day} ${month} ${hours}:${minutes}`
  }

  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
  ]

  const dayNames = ['B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən', 'Baz']

  const quickOptions = getQuickOptions()
  const calendarDays = getDaysInMonth(currentMonth)

  const defaultTriggerClass =
    'cursor-pointer flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors bg-white w-full text-left'

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName ?? defaultTriggerClass}
      >
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={`text-sm flex-1 min-w-0 truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {formatDisplayValue()}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            className="p-0.5 hover:bg-gray-100 rounded shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto"
          style={{ top: position.top, left: position.left, width: position.width || 520 }}
        >
          <div className="flex flex-col sm:flex-row">
            <div className="w-full sm:w-[200px] border-b sm:border-b-0 sm:border-r border-gray-100 py-2 bg-gray-50/50">
              <div className="flex flex-wrap sm:flex-col gap-1 px-2 sm:px-0">
                {quickOptions.map((option, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => handleQuickSelect(option)}
                    className="flex-1 sm:flex-none sm:w-full flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-white transition-colors whitespace-nowrap rounded sm:rounded-none"
                  >
                    <span className="text-gray-700">{option.label}</span>
                    <span className="text-gray-400 text-[10px] sm:text-xs ml-2 sm:ml-3 hidden sm:inline">{option.shortDate}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-semibold text-gray-800">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date()
                      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                    }}
                    className="px-2 py-1 text-[10px] sm:text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Bugün
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((day, index) => (
                  <div key={index} className="text-center text-[10px] sm:text-xs font-medium text-gray-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {calendarDays.map((dayInfo, index) => {
                  const isPast = disablePastDays && isPastDate(dayInfo.date)
                  return (
                    <button
                      type="button"
                      key={index}
                      onClick={() => handleDayClick(dayInfo)}
                      disabled={isPast}
                      className={`
                        w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm rounded-full flex items-center justify-center transition-all
                        ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                        ${!dayInfo.isCurrentMonth && !isPast ? 'text-gray-300' : ''}
                        ${dayInfo.isCurrentMonth && !isPast ? 'text-gray-700' : ''}
                        ${isToday(dayInfo.date) && !isSelected(dayInfo.date) ? 'bg-red-100 text-red-600 font-medium' : ''}
                        ${isSelected(dayInfo.date) ? 'bg-blue-500 text-white font-medium' : ''}
                        ${dayInfo.isCurrentMonth && !isSelected(dayInfo.date) && !isToday(dayInfo.date) && !isPast ? 'hover:bg-gray-100' : ''}
                      `}
                    >
                      {dayInfo.day}
                    </button>
                  )
                })}
              </div>

              {selectedDate && !dateOnly && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={selectedTime.hours}
                        onChange={(e) => setSelectedTime({ ...selectedTime, hours: e.target.value.padStart(2, '0') })}
                        className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded"
                      />
                      <span className="text-gray-400">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={selectedTime.minutes}
                        onChange={(e) => setSelectedTime({ ...selectedTime, minutes: e.target.value.padStart(2, '0') })}
                        className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="flex-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Təmizlə
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDate(selectedDate)}
                      className="flex-1 px-3 py-1.5 text-xs text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                    >
                      Təsdiqlə
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default ModalDatePicker
