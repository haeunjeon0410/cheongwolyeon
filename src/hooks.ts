import { useCallback, useEffect, useState } from 'react'

export type LocationStatus = 'idle' | 'loading' | 'success' | 'denied' | 'error' | 'unsupported'

export function useGeolocation(): {
  position: GeolocationPosition | null
  status: LocationStatus
  errorMessage: string
  requestLocation: () => void
  setPosition: (position: GeolocationPosition | null) => void
  setStatus: (status: LocationStatus) => void
} {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const requestLocation = useCallback(() => {
    if (
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setStatus('error')
      setErrorMessage('위치 정보는 HTTPS 연결 또는 localhost에서만 사용할 수 있습니다.')
      return
    }

    if (!navigator.geolocation) {
      setStatus('unsupported')
      setErrorMessage('이 브라우저는 위치 서비스를 지원하지 않습니다.')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    navigator.geolocation.getCurrentPosition(
      (nextPosition) => {
        console.log('📍 GPS 위치 획득:', {
          latitude: nextPosition.coords.latitude,
          longitude: nextPosition.coords.longitude,
          accuracy: nextPosition.coords.accuracy
        })
        setPosition(nextPosition)
        setStatus('success')
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('denied')
          setErrorMessage('위치 권한이 차단되어 있습니다. 브라우저의 사이트 설정에서 위치 권한을 허용한 뒤 다시 눌러주세요.')
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setStatus('error')
          setErrorMessage('현재 위치를 가져올 수 없습니다. GPS 연결을 확인해 주세요.')
        } else if (error.code === error.TIMEOUT) {
          setStatus('error')
          setErrorMessage('위치 확인 요청 시간이 초과되었습니다.')
        } else {
          setStatus('error')
          setErrorMessage('위치 확인 중 오류가 발생했습니다.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    )
  }, [])

  // 자동 요청 제거 - 사용자가 명시적으로 버튼을 눌러야 함
  // useEffect(() => {
  //   requestLocation()
  // }, [requestLocation])

  return { position, status, errorMessage, requestLocation, setPosition, setStatus }
}
