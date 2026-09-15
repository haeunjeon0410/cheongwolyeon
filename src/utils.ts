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
  
  // 축제 날짜 확인
  const festivalDate = FESTIVAL_DATES[date]
  const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const festivalDay = new Date(festivalDate.getFullYear(), festivalDate.getMonth(), festivalDate.getDate())
  
  // 축제 날짜가 아니면 무조건 false
  if (currentDate.getTime() !== festivalDay.getTime()) {
    return false
  }
  
  // "시간 미정"인 경우 false
  if (timeStr.includes('미정')) {
    return false
  }
  
  // 시간 파싱 (예: "13:00", "14:40")
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (!timeMatch) {
    return false
  }
  
  const [, hourStr, minuteStr] = timeMatch
  const eventHour = parseInt(hourStr, 10)
  const eventMinute = parseInt(minuteStr, 10)
  
  // 이벤트 시작 시간
  const eventStart = new Date(festivalDate.getFullYear(), festivalDate.getMonth(), festivalDate.getDate(), eventHour, eventMinute)
  
  // 이벤트 종료 시간 추정 (시작 후 1시간 30분)
  const eventEnd = new Date(eventStart.getTime() + 90 * 60 * 1000)
  
  // 현재 시간이 시작~종료 사이인지 확인
  return now >= eventStart && now <= eventEnd
}
