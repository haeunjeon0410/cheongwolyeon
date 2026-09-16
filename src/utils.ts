export function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earth = 6371e3
  const radians = (value: number) => (value * Math.PI) / 180
  const a =
    Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(meters?: number) {
  if (meters === undefined) return '위치 정보 미제공'
  if (meters < 1000) return `약 ${Math.max(5, Math.round(meters / 5) * 5)}m`
  return `약 ${(meters / 1000).toFixed(1)}km`
}


export function isWithinCampus(latitude: number, longitude: number, campus: 'campus1' | 'campus2', marginMeters = 70) {
  const bounds =
    campus === 'campus1'
      ? { minLat: 37.54526, maxLat: 37.546578, minLon: 126.963425, maxLon: 126.965274 }
      : { minLat: 37.544264, maxLat: 37.544672, minLon: 126.963936, maxLon: 126.964202 }

  // Expand the map bounds slightly so GPS 오차 때문에 교정문/출입구 근처에서
  // 현재 위치 점이 갑자기 사라지지 않도록 합니다.
  const latMargin = marginMeters / 111_000
  const lonMargin = marginMeters / (111_000 * Math.cos((latitude * Math.PI) / 180))

  return (
    latitude >= bounds.minLat - latMargin &&
    latitude <= bounds.maxLat + latMargin &&
    longitude >= bounds.minLon - lonMargin &&
    longitude <= bounds.maxLon + lonMargin
  )
}

export function gpsToMapPosition(latitude: number, longitude: number, campus: 'campus1' | 'campus2') {
  const bounds =
    campus === 'campus1'
      ? { minLat: 37.54526, maxLat: 37.546578, minLon: 126.963425, maxLon: 126.965274 }
      : { minLat: 37.544264, maxLat: 37.544672, minLon: 126.963936, maxLon: 126.964202 }
  const clamp = (value: number) => Math.max(5, Math.min(95, value))
  return {
    x: clamp(((longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100),
    y: clamp((1 - (latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100),
  }
}

export function getDirectionsUrl(name: string, lat: number, lng: number) {
  // 카카오맵 길찾기 URL (또는 네이버 지도)
  const encodedName = encodeURIComponent(name)
  return `https://map.kakao.com/link/to/${encodedName},${lat},${lng}`
}

// 실제 축제 날짜 (2026년 9월 16일, 17일)
const FESTIVAL_DATES = {
  day1: new Date('2026-09-16'),
  day2: new Date('2026-09-17'),
}

// 공연이 현재 진행 중인지 판단
export function isEventActive(date: 'day1' | 'day2', timeStr: string): boolean {
  const now = new Date()
  const festivalDate = FESTIVAL_DATES[date]
  const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const festivalDay = new Date(festivalDate.getFullYear(), festivalDate.getMonth(), festivalDate.getDate())

  if (currentDate.getTime() !== festivalDay.getTime()) return false
  if (timeStr.includes('미정')) return false

  // 실제 공연 시간 범위가 있으면 시작~종료를 그대로 사용합니다.
  // 예: 16:13~16:31 → 16:13부터 16:31까지만 진행 중
  const rangeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/)
  if (rangeMatch) {
    const [, startHour, startMinute, endHour, endMinute] = rangeMatch
    const eventStart = new Date(
      festivalDate.getFullYear(), festivalDate.getMonth(), festivalDate.getDate(),
      parseInt(startHour, 10), parseInt(startMinute, 10)
    )
    const eventEnd = new Date(
      festivalDate.getFullYear(), festivalDate.getMonth(), festivalDate.getDate(),
      parseInt(endHour, 10), parseInt(endMinute, 10)
    )
    return now >= eventStart && now < eventEnd
  }

  // 종료 시간이 없는 단일 시작 시각은 기존 일정 호환을 위해 90분으로 처리합니다.
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (!timeMatch) return false
  const [, hourStr, minuteStr] = timeMatch
  const eventStart = new Date(
    festivalDate.getFullYear(), festivalDate.getMonth(), festivalDate.getDate(),
    parseInt(hourStr, 10), parseInt(minuteStr, 10)
  )
  const eventEnd = new Date(eventStart.getTime() + 90 * 60 * 1000)
  return now >= eventStart && now < eventEnd
}
