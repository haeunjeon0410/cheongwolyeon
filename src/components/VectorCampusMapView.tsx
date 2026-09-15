import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { Navigation, Plus, Minus } from 'lucide-react'
import type { Booth, Campus, Day } from '../types'
import { gpsToMapPosition, isWithinCampus } from '../utils'

type MapItem = { booth: Booth; location: { code: string; mapPosition: { x: number; y: number }; mapSize?: { width: number; height: number }; latitude: number; longitude: number } }
type Props = { campus: Campus; day: Day; setDay: (day: Day) => void; visibleItems: MapItem[]; selectedBooth: Booth | null; lastViewedBooth: Booth | null; setSelectedBooth: (booth: Booth | null) => void; status: string; coords?: GeolocationCoordinates; requestLocation: () => void }
const mapSources: Record<Campus, string> = { campus1: '/assets/maps/campus1.png', campus2: '/assets/maps/campus2.png' }

type Point = { x: number; y: number }

export default function VectorCampusMapView({ campus, day, setDay, visibleItems, selectedBooth, lastViewedBooth, setSelectedBooth, status, coords, requestLocation }: Props) {
  const [zoom, setZoom] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 980 ? 1.18 : 1))
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)
  const pointersRef = useRef(new Map<number, Point>())
  const pinchRef = useRef<{ distance: number; zoom: number; midpoint: Point; didPinch: boolean } | null>(null)

  const clampPan = (x: number, y: number, nextZoom = zoom) => {
    const width = viewportRef.current?.clientWidth ?? 800
    const height = viewportRef.current?.clientHeight ?? 600
    const maxX = Math.max(0, width * (nextZoom - 1) / 2)
    const maxY = Math.max(0, height * (nextZoom - 1) / 2)
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) }
  }

  const changeZoom = (next: number, around?: Point, baseZoom = zoom) => {
    const value = Math.max(1, Math.min(4, next))
    const oldZoom = baseZoom
    const viewport = viewportRef.current
    if (around && viewport && oldZoom !== value) {
      const rect = viewport.getBoundingClientRect()
      const cx = rect.width / 2
      const cy = rect.height / 2
      const mx = around.x - rect.left
      const my = around.y - rect.top
      const nextX = (mx - cx) - ((mx - cx - pan.x) / oldZoom) * value
      const nextY = (my - cy) - ((my - cy - pan.y) / oldZoom) * value
      setPan(clampPan(nextX, nextY, value))
    } else {
      setPan((current) => value === 1 ? { x: 0, y: 0 } : clampPan(current.x, current.y, value))
    }
    setZoom(value)
  }

  const focusMapPosition = (x: number, y: number, nextZoom = 1.8) => {
    const width = viewportRef.current?.clientWidth ?? 800
    const height = viewportRef.current?.clientHeight ?? 600
    const zoomValue = Math.max(1, Math.min(4, nextZoom))
    setZoom(zoomValue)
    setPan(clampPan(((50 - x) / 100) * width * zoomValue, ((50 - y) / 100) * height * zoomValue, zoomValue))
  }

  useEffect(() => {
    if (!selectedBooth) return
    const match = visibleItems.find((item) => item.booth.id === selectedBooth.id)
    if (!match) return
    const timer = window.setTimeout(() => focusMapPosition(match.location.mapPosition.x, match.location.mapPosition.y, 1.65), 0)
    return () => window.clearTimeout(timer)
  }, [selectedBooth?.id, campus])

  const getDistance = () => {
    const points = Array.from(pointersRef.current.values())
    if (points.length < 2) return 0
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
  }

  const getMidpoint = () => {
    const points = Array.from(pointersRef.current.values())
    return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)

    if (pointersRef.current.size >= 2) {
      const midpoint = getMidpoint()
      pinchRef.current = { distance: getDistance(), zoom, midpoint, didPinch: false }
      setDragging(false)
      return
    }

    if (zoom <= 1) return
    setDragging(true)
    setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y })
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const distance = getDistance()
      const ratio = pinchRef.current.distance ? distance / pinchRef.current.distance : 1
      const nextZoom = Math.max(1, Math.min(4, pinchRef.current.zoom * ratio))
      pinchRef.current.didPinch = true
      changeZoom(nextZoom, pinchRef.current.midpoint, pinchRef.current.zoom)
      pinchRef.current.distance = distance
      pinchRef.current.zoom = nextZoom
      pinchRef.current.midpoint = getMidpoint()
      return
    }

    if (dragging) setPan(clampPan(event.clientX - dragStart.x, event.clientY - dragStart.y))
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    setDragging(false)
  }

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    changeZoom(zoom + (event.deltaY < 0 ? .2 : -.2), { x: event.clientX, y: event.clientY })
  }

  return <div className="desktop-map-view html-hotspot-map">
    <div ref={viewportRef} className={`map-pan-viewport ${dragging ? 'dragging' : ''}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
      <div className="html-map-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <img className="map-bg-img" src={mapSources[campus]} alt={`${campus} 배치도`} draggable={false} />
        <div className="booth-hotspot-layer">
          {visibleItems.map((item) => {
            const pos = item.location.mapPosition
            const isSelected = selectedBooth?.id === item.booth.id
            return <button
              type="button"
              key={`${item.booth.id}-${item.location.code}`}
              className={`booth-hotspot ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: item.location.mapSize ? `${item.location.mapSize.width / 1536 * 100}%` : '3.2%',
                height: item.location.mapSize ? `${item.location.mapSize.height / 1024 * 100}%` : '3.2%',
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setSelectedBooth(item.booth)}
              aria-label={item.location.code}
            >
              <span>{item.location.code}</span>
            </button>
          })}
        </div>
        {lastViewedBooth && (() => {
          const item = visibleItems.find((entry) => entry.booth.id === lastViewedBooth.id)
          if (!item) return null
          const pos = item.location.mapPosition
          const width = item.location.mapSize ? item.location.mapSize.width / 1536 * 100 : 3.2
          const height = item.location.mapSize ? item.location.mapSize.height / 1024 * 100 : 3.2
          return (
            <div className="selected-booth-marker-layer" aria-hidden="true">
              <img
                className="selected-booth-marker"
                style={{
                  // mapPosition 자체가 부스의 중심점이다. 따라서 X는 그대로 사용하고,
                  // Y만 부스 상단으로 올려 마커의 끝점이 정확히 부스 중앙 위에 닿게 한다.
                  left: `${pos.x}%`,
                  top: `calc(${pos.y}% - ${height / 2}%)`,
                  transform: 'translate(-50%, -100%)',
                }}
                src="/assets/markers/lantern-marker-cropped.png"
                alt=""
                draggable={false}
              />
            </div>
          )
        })()}
        {status === 'success' && coords && isWithinCampus(coords.latitude, coords.longitude, campus) && (() => { const pos = gpsToMapPosition(coords.latitude, coords.longitude, campus); return <div className="user-current-dot" style={{ left: `${pos.x}%`, top: `${pos.y}%` }} /> })()}
      </div>
      <div className="map-day-switcher" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" className={`zone-chip-btn ${day === 'day1' ? 'active' : ''}`} onClick={() => setDay('day1')}>DAY 1</button>
        <button type="button" className={`zone-chip-btn ${day === 'day2' ? 'active' : ''}`} onClick={() => setDay('day2')}>DAY 2</button>
      </div>
      <div className="map-floating-controls" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" className="map-control-btn" onClick={() => changeZoom(zoom + .5)} title="확대"><Plus size={19} /></button>
        <button type="button" className="map-control-btn" onClick={() => changeZoom(zoom - .5)} title="축소"><Minus size={19} /></button>
        <button
          type="button"
          className={`map-control-btn ${status === 'success' && coords ? 'has-location' : ''}`}
          onClick={() => {
            if (coords) {
              const pos = gpsToMapPosition(coords.latitude, coords.longitude, campus)
              focusMapPosition(pos.x, pos.y, 1.9)
            } else {
              requestLocation()
            }
          }}
          title={coords ? '내 위치로 이동' : '현재 위치 사용'}
        ><Navigation size={17} /></button>
      </div>
    </div>
  </div>
}
