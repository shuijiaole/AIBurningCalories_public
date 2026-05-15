export function getDateValue(input = new Date()) {
  const year = input.getFullYear()
  const month = `${input.getMonth() + 1}`.padStart(2, '0')
  const day = `${input.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function isTodayDate(dateValue: string) {
  return dateValue === getDateValue()
}

export function formatDateLabel(dateValue: string) {
  const [, month = '00', day = '00'] = dateValue.split('-')

  if (isTodayDate(dateValue)) {
    return `今天 · ${month}/${day}`
  }

  return `${month}/${day}`
}

export function formatDateFull(dateValue: string) {
  return dateValue.replace(/-/g, '/')
}

export function formatTimeLabel(input = new Date()) {
  const hours = `${input.getHours()}`.padStart(2, '0')
  const minutes = `${input.getMinutes()}`.padStart(2, '0')

  return `${hours}:${minutes}`
}
