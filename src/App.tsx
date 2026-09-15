import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronRight,
  Compass,
  Gamepad2,
  LocateFixed,
  MapPin,
  Music2,
  Search,
  ShoppingBag,
  Sparkles,
  Users,
  Utensils,
  X,
} from 'lucide-react'
import { booths, locations, schedules } from './data'
import { artists, foodTrucks, notices, sponsors, rides, photoBooths, hanbokRental, stampProgram, stageMC } from './eventData'
import { useGeolocation, type LocationStatus } from './hooks'
import { distanceInMeters, formatDistance, gpsToMapPosition, isEventActive } from './utils'
import type { Booth, Campus, Day } from './types'
import VectorCampusMapView from './components/VectorCampusMapView'

// 카테고리 키워드에 따른 부스 썸네일 아이콘
function getCategoryIcon(category?: string) {
  if (!category) return Sparkles
  if (category.includes('먹거리')) return Utensils
  if (category.includes('게임')) return Gamepad2
  if (category.includes('공연')) return Music2
  if (category.includes('동아리')) return Users
  if (category.includes('굿즈')) return ShoppingBag
  return Sparkles
}

const assets = {
  welcome: '/assets/mascot/nunsongi-welcome-20260915-040013.png',
  mapMascot: '/assets/mascot/nunsongi-map-20260915-040604.png',
  emptyMascot: '/assets/mascot/nunsongi-empty-20260915-040613.png',
  lanternMarker: '/assets/markers/lantern-marker-20260915-040004.png',
}


function DaySwitcher({ day, setDay, compact = false }: { day: Day; setDay: (day: Day) => void; compact?: boolean }) {
  return (
    <div className={`day-switcher ${compact ? 'compact' : ''}`} role="tablist" aria-label="축제 날짜 선택">
      <button type="button" className={day === 'day1' ? 'active' : ''} onClick={() => setDay('day1')}>
        <span>DAY 1</span><small>9.16 수</small>
      </button>
      <button type="button" className={day === 'day2' ? 'active' : ''} onClick={() => setDay('day2')}>
        <span>DAY 2</span><small>9.17 목</small>
      </button>
    </div>
  )
}

function ArtistLineup({ day }: { day: Day }) {
  const dayArtists = artists.filter((artist) => artist.day === day)
  return (
    <section className="artist-lineup">
      <div className="section-kicker">MAIN STAGE</div>
      <div className="artist-lineup-heading">
        <div>
          <h3>{day === 'day1' ? 'DAY 1 · 아티스트 라인업' : 'DAY 2 · 아티스트 라인업'}</h3>
          <p>청파제 밤을 채우는 메인 무대</p>
        </div>
        <Music2 size={20} />
      </div>
      <div className="artist-chips">
        {dayArtists.map((artist) => (
          <div className="artist-chip" key={artist.id}>
            <span>{artist.name}</span>
            {artist.note && <small>{artist.note}</small>}
          </div>
        ))}
      </div>
    </section>
  )
}


function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase('ko-KR').replace(/\s+/g, '').trim()
}

function groupBoothItems<T extends { booth: Booth; location: any; distance?: number }>(items: T[]): Array<T & { locationCodes?: string[] }> {
  const grouped = new Map<string, T>()
  for (const item of items) {
    const key = `${item.booth.date}::${normalizeSearchText(item.booth.name)}`
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, { ...item })
    } else {
      // 같은 팀이 여러 칸을 사용하는 경우 하나의 부스로 보여준다.
      const merged = { ...existing } as T & { locationCodes?: string[] }
      const codes = new Set([...(merged.locationCodes || [existing.location.code]), item.location.code])
      merged.locationCodes = Array.from(codes)
      if ((item.distance ?? Infinity) < (existing.distance ?? Infinity)) merged.distance = item.distance
      grouped.set(key, merged)
    }
  }
  return Array.from(grouped.values())
}

function FestivalIntro({ onEnter }: { onEnter: () => void }) {
  useEffect(() => {
    const exitTimer = window.setTimeout(onEnter, 4200)
    return () => window.clearTimeout(exitTimer)
  }, [onEnter])

  return (
    <div className="festival-intro" role="dialog" aria-modal="true" aria-label="청월연 축제 안내">
      <div className="intro-stars" aria-hidden="true" />
      <img className="intro-cloud intro-cloud-one" src="/assets/decoration/cloud-long-20260915-040004.png" alt="" />
      <img className="intro-cloud intro-cloud-two" src="/assets/decoration/cloud-small-20260915-040021.png" alt="" />
      <img className="intro-moon" src="/assets/decoration/full-moon-20260915-040004.png" alt="" />
      <img className="intro-halo" src="/assets/decoration/moonlight-halo-20260915-040023.png" alt="" />
      <img className="intro-lantern intro-lantern-left" src="/assets/decoration/lantern-hanging-20260915-040004.png" alt="" />
      <img className="intro-lantern intro-lantern-right" src="/assets/decoration/lantern-hand-20260915-040026.png" alt="" />
      <div className="intro-content">
        <div className="intro-kicker">2026 CHEONGPA FESTIVAL</div>
        <h1 className="font-serif">青月宴</h1>
        <p className="intro-title">청월연</p>
        <img src={assets.emptyMascot} alt="청월연 마스코트 눈송이" className="intro-mascot" />
        <p className="intro-copy">달빛 아래, 우리의 청춘이<br />채워지는 시간</p>
        <div className="intro-continue">9.16 WED — 9.17 THU · 숙명여자대학교</div>
      </div>
    </div>
  )
}

function FestivalInfo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`festival-info ${compact ? 'compact' : ''}`}>
      <section className="info-hero-card">
        <div>
          <span className="section-kicker">CHEONGWOL YEON</span>
          <h2 className="font-serif">달빛 아래,<br />우리의 연회를 시작해요.</h2>
          <p>2026 청파제 청월연 공식 가이드에서 부스, 공연, 먹거리와 축제 프로그램을 한 번에 확인하세요.</p>
        </div>
        <img src={assets.welcome} alt="" />
      </section>

      <section className="info-card">
        <div className="info-card-title"><span>NOTICE</span><strong>축제 안내</strong></div>
        <div className="info-list">
          {notices.slice(0, compact ? 3 : notices.length).map((notice) => (
            <details key={notice.id} className="info-disclosure">
              <summary>{notice.title}<span>+</span></summary>
              <p>{notice.body}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="info-grid">
        <div className="info-card">
          <div className="info-card-title"><span>FOOD</span><strong>푸드트럭</strong></div>
          <p className="info-muted">순헌사거리 · 11:00 — 22:00</p>
          <div className="mini-tag-list">{foodTrucks.map((item) => <span key={item.id}>{item.name}</span>)}</div>
        </div>
        <div className="info-card">
          <div className="info-card-title"><span>PLAY</span><strong>즐길거리</strong></div>
          <p className="info-muted">{rides.map((ride) => ride.name).join(' · ')}</p>
          <p className="info-muted">{photoBooths.map((photo) => `${photo.location} 포토부스`).join(' · ')}</p>
        </div>
      </section>

      <section className="info-card info-program-card">
        <img src="/assets/mascot/nunsongi-empty-20260915-040613.png" alt="" />
        <div>
          <div className="info-card-title"><span>STAMP</span><strong>{stampProgram.name}</strong></div>
          <p>{stampProgram.mainBooth} · {stampProgram.hours}</p>
          <small>{stampProgram.rewards.map((reward) => `${reward.stamps}개 ${reward.reward}`).join('  ·  ')}</small>
        </div>
      </section>

      <section className="info-card">
        <div className="info-card-title"><span>PARTNERS</span><strong>함께하는 곳</strong></div>
        <div className="sponsor-list">
          {sponsors.map((sponsor) => <div key={sponsor.id}><b>{sponsor.name}</b><p>{sponsor.description}</p></div>)}
        </div>
        <div className="hanbok-note"><b>한복 대여</b><span>{hanbokRental.location} · {hanbokRental.hours}</span></div>
      </section>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<'map' | 'nearby' | 'schedule' | 'more'>('map')
  const [campus, setCampus] = useState<Campus>('campus1')
  const [day, setDay] = useState<Day>('day1')
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [nearbyFilter, setNearbyFilter] = useState<'all' | 'food' | 'experience' | 'store'>('all')
  const [recentBooths, setRecentBooths] = useState<Booth[]>([])
  // 앱에 들어올 때마다 짧은 시네마틱 인트로를 보여준다.
  const [showIntro, setShowIntro] = useState(true)
  const dismissIntro = () => setShowIntro(false)

  const rememberBooth = (booth: Booth) => {
    setRecentBooths((current) => [booth, ...current.filter((item) => item.id !== booth.id)].slice(0, 4))
    setSelectedBooth(booth)
  }

  const { position, status, requestLocation, setPosition } = useGeolocation()
  const coords = position?.coords

  useEffect(() => {
    if (tab === 'nearby' && status === 'idle') requestLocation()
  }, [tab, status, requestLocation])

  useEffect(() => {
    if (selectedBooth) {
      setRecentBooths((current) => [selectedBooth, ...current.filter((item) => item.id !== selectedBooth.id)].slice(0, 4))
    }
  }, [selectedBooth])

  // 부스 및 좌표 데이터 매핑 및 검색 필터링
  const allCampusItems = useMemo(() => booths
    .filter((b) => b.date === day)
    .map((b) => ({ booth: b, location: locations.find((loc) => loc.id === b.locationId)! }))
    .filter((item) => item.location && item.location.campus === campus), [day, campus])

  const visibleItems = useMemo(() => {
    const q = normalizeSearchText(searchQuery)
    if (!q) return allCampusItems
    return allCampusItems.filter((item) => {
      const haystack = normalizeSearchText([
        item.booth.name, item.booth.category, item.booth.description,
        item.booth.menu?.join(' '), item.booth.events?.join(' '),
        item.location.code, item.location.location,
      ].filter(Boolean).join(' '))
      return haystack.includes(q)
    })
  }, [allCampusItems, searchQuery])

  const searchResults = useMemo(() => groupBoothItems(visibleItems).slice(0, 6), [visibleItems])

  // 거리 계산 및 정렬
  const nearbyItems = useMemo(() => {
    if (coords) {
      console.log('📏 거리 계산 시작:', {
        userLat: coords.latitude,
        userLon: coords.longitude,
        firstBoothLat: visibleItems[0]?.location.latitude,
        firstBoothLon: visibleItems[0]?.location.longitude
      })
    }
    return visibleItems
      .map((item) => ({
        ...item,
        distance: coords
          ? distanceInMeters(coords.latitude, coords.longitude, item.location.latitude, item.location.longitude)
          : undefined,
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
  }, [visibleItems, coords])

  const nearbyDisplayItems = useMemo(() => {
    const filtered = nearbyFilter === 'all' ? nearbyItems : nearbyItems.filter(({ booth }) => {
      const category = booth.category || ''
      if (nearbyFilter === 'food') return category.includes('먹거리')
      if (nearbyFilter === 'experience') return category.includes('체험') || category.includes('게임') || category.includes('이벤트')
      if (nearbyFilter === 'store') return category.includes('굿즈') || category.includes('판매')
      return true
    })
    return groupBoothItems(filtered)
  }, [nearbyItems, nearbyFilter])


  const selectedLocation = useMemo(
    () => (selectedBooth ? locations.find((l) => l.id === selectedBooth.locationId) : null),
    [selectedBooth]
  )

  const selectedDistance = useMemo(
    () => (selectedBooth ? nearbyItems.find((i) => i.booth.id === selectedBooth.id)?.distance : undefined),
    [selectedBooth, nearbyItems]
  )

  return (
    <>
      <div className="festival-atmosphere" aria-hidden="true">
        <img className="atmosphere-stars" src="/assets/decoration/stars-20260915-040004.png" alt="" />
        <img className="atmosphere-moon" src="/assets/decoration/crescent-moon-20260915-040004.png" alt="" />
        <img className="atmosphere-cloud cloud-one" src="/assets/decoration/cloud-long-20260915-040004.png" alt="" />
        <img className="atmosphere-cloud cloud-two" src="/assets/decoration/cloud-small-20260915-040021.png" alt="" />
      </div>
      {showIntro && <FestivalIntro onEnter={dismissIntro} />}
      {/* 📱 Mobile Layout */}
      <div className="app-container">
        {/* Mobile Top Header */}
        <header className="mobile-header">
          <button className="mobile-brand brand-home-button" onClick={() => { setTab('map'); setSelectedBooth(null) }} aria-label="홈으로">
            <h1>青月宴</h1>
            <span>2026 청파제</span>
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="header-action-btn"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="검색"
            >
              <Search size={18} />
            </button>

          </div>
        </header>

        {/* Mobile Search Overlay Bar */}
        {isSearchOpen && (
          <div style={{ padding: '10px 16px', background: 'rgba(6, 18, 48, 0.95)', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <div className="desktop-search-box" style={{ maxWidth: '100%' }}>
              <Search size={16} color="#c4d1e8" />
              <input
                type="text"
                placeholder="부스 이름, 키워드로 검색해보세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X size={14} color="#a0b0d0" />
                </button>
              )}
              {searchQuery.trim() && (
                <div className="search-results-popover mobile-search-results">
                  {searchResults.length ? searchResults.map(({ booth, location }) => (
                    <button key={booth.id} type="button" onClick={() => { rememberBooth(booth); setTab('map'); setSearchQuery(''); setIsSearchOpen(false) }}>
                      <span>{booth.name}</span><small>{booth.category || '부스'} · {location.location}</small>
                    </button>
                  )) : <div className="search-empty">검색 결과가 없습니다.</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Map View */}
        {tab === 'map' && (
          <>
            <div className="segment-switcher-box">
              <div className="segment-row">
                <button
                  className={campus === 'campus1' ? 'active' : ''}
                  onClick={() => setCampus('campus1')}
                >
                  1캠퍼스
                </button>
                <button
                  className={campus === 'campus2' ? 'active' : ''}
                  onClick={() => setCampus('campus2')}
                >
                  2캠퍼스
                </button>
              </div>
            </div>

            <main style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column' }}>
              <div className="map-home-shell">
                <VectorCampusMapView
                  campus={campus}
                  day={day}
                  setDay={setDay}
                  visibleItems={visibleItems}
                  selectedBooth={selectedBooth}
                  setSelectedBooth={setSelectedBooth}
                  status={status}
                  coords={coords}
                  requestLocation={requestLocation}
                />
              </div>

            </main>
          </>
        )}

        {/* Tab 2: All Booths View */}
        {tab === 'nearby' && (
          <main className="nearby-view-container">
            <div className="view-heading">
              <p>내 주변</p>
              <h2>내 주변 부스</h2>
              <small>
                {status === 'loading' 
                  ? '위치를 확인하는 중입니다...'
                  : coords 
                  ? '현재 위치 기준 가까운 순서' 
                  : '아래 버튼을 눌러 위치를 허용하면 거리를 볼 수 있습니다'}
              </small>
            </div>


            {recentBooths.length > 0 && (
              <section className="recent-booths-section" aria-label="최근 본 부스">
                <div className="recent-booths-heading">
                  <span>RECENT</span>
                  <strong>최근 본 부스</strong>
                </div>
                <div className="recent-booths-list">
                  {recentBooths.map((booth) => {
                    const location = locations.find((item) => item.id === booth.locationId)
                    if (!location) return null
                    return (
                      <button key={booth.id} type="button" className="recent-booth-chip" onClick={() => { rememberBooth(booth); setTab('map') }}>
                        <span>{location.code}</span>
                        <strong>{booth.name}</strong>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            <div className="nearby-toolbar">
              <div className="nearby-filter-row" role="tablist" aria-label="부스 카테고리 필터">
                {([
                  ['all', '전체'],
                  ['food', '음식'],
                  ['experience', '체험'],
                  ['store', '상점'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`nearby-filter-chip ${nearbyFilter === key ? 'active' : ''}`}
                    onClick={() => setNearbyFilter(key)}
                  >{label}</button>
                ))}
              </div>
              <button className="location-permission-btn" onClick={requestLocation} disabled={status === 'loading'} title="위치 권한 사용">
                <LocateFixed size={13} />
                <span>{status === 'loading' ? '확인 중' : coords ? '위치 새로고침' : '위치 권한'}</span>
              </button>
            </div>

            {nearbyDisplayItems.map(({ booth, location, distance, locationCodes }) => {
              const CategoryIcon = getCategoryIcon(booth.category)
              return (
                <button
                  key={booth.id}
                  className="booth-list-card"
                  onClick={() => { rememberBooth(booth); setTab('map') }}
                >
                  {distance !== undefined && <div className="booth-distance-tag">{formatDistance(distance)}</div>}
                  <div className="booth-thumb-avatar">
                    <CategoryIcon size={20} />
                  </div>
                  <div className="booth-info-text">
                    <b>{booth.name}</b>
                    <small>
                      {booth.category} · {location.location}
                    </small>
                  </div>
                  <ChevronRight size={18} color="#c4d1e8" />
                </button>
              )
            })}
          </main>
        )}

        {/* Tab 3: Schedule View */}
        {tab === 'schedule' && (
          <main className="schedule-view-container">
            <div className="view-heading schedule-heading">
              <p>LIVE & STAGE</p>
              <h2>공연 일정</h2>
              <small>오늘의 무대와 아티스트를 DAY별로 확인하세요.</small>
            </div>

            <DaySwitcher day={day} setDay={setDay} />
            <ArtistLineup day={day} />

            <div className="schedule-mc-card">
              <div className="schedule-mc-icon"><Music2 size={16} /></div>
              <div>
                <span>STAGE MC</span>
                <strong>{stageMC.name}</strong>
                <p>{stageMC.description}</p>
              </div>
            </div>

            <div className="timeline-list">
              {schedules
                .filter((s) => s.date === day)
                .map((item) => {
                  const isCurrentActive = isEventActive(item.date, item.time)
                  return (
                    <div key={`${item.date}-${item.time}-${item.title}`} className={`timeline-item ${isCurrentActive ? 'active' : ''}`}>
                      <div className="timeline-time">{item.time}</div>
                      <div className="timeline-axis">
                        <div className="timeline-node" />
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header-row">
                          <strong>{item.title}</strong>
                          {isCurrentActive && <span className="timeline-active-badge">현재 진행 중</span>}
                        </div>
                        <small>
                          <MapPin size={12} /> {item.place}
                        </small>
                      </div>
                    </div>
                  )
                })}
            </div>

            <div className="mascot-callout-banner" style={{ marginTop: '16px' }}>
              <img src={assets.welcome} alt="" className="mascot-callout-img" />
              <div className="mascot-callout-content">
                <strong className="font-serif">"달빛 아래 특별한 순간들을 놓치지 마세요!"</strong>
                <small>2026 청파제 청월연 연회 안내</small>
              </div>
            </div>
          </main>
        )}

        {/* Tab 4: More / About View */}
        {tab === 'more' && (
          <main className="nearby-view-container info-page-container">
            <div className="view-heading">
              <p>INFORMATION</p>
              <h2>축제 및 연회 안내</h2>
            </div>
            <FestivalInfo />
          </main>
        )}

        {/* Mobile Bottom Navigation Bar */}
        <nav className="bottom-nav-bar">
          <button
            className={`nav-tab-btn ${tab === 'map' ? 'active' : ''}`}
            onClick={() => setTab('map')}
          >
            <Compass size={20} />
            <span>축제 지도</span>
          </button>
          <button
            className={`nav-tab-btn ${tab === 'nearby' ? 'active' : ''}`}
            onClick={() => setTab('nearby')}
          >
            <LocateFixed size={20} />
            <span>내 주변</span>
          </button>
          <button
            className={`nav-tab-btn ${tab === 'schedule' ? 'active' : ''}`}
            onClick={() => setTab('schedule')}
          >
            <CalendarDays size={20} />
            <span>공연 일정</span>
          </button>
          <button
            className={`nav-tab-btn ${tab === 'more' ? 'active' : ''}`}
            onClick={() => setTab('more')}
          >
            <Sparkles size={20} />
            <span>더보기</span>
          </button>
        </nav>

        {/* Mobile Sleek Compact Booth Detail Modal */}
        {selectedBooth && selectedLocation && (
          <div className="modal-backdrop" onClick={() => setSelectedBooth(null)}>
            <div className="hanji-card-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-grabber-line" />
              <button className="sheet-close-btn" onClick={() => setSelectedBooth(null)} aria-label="닫기">
                <X size={16} />
              </button>

              <div className="hanji-card-meta">
                <span className="code-pill-tag">{selectedLocation.code}</span>
                {selectedBooth.category && <span className="category-tag">{selectedBooth.category}</span>}
              </div>

              <div className="detail-hero-art">
                <img src="/assets/decoration/crescent-moon-20260915-040004.png" alt="" />
                <img className="detail-hero-mascot" src={assets.mapMascot} alt="" />
                <div>
                  <span>{selectedLocation.code}</span>
                  <strong>청파제 부스</strong>
                </div>
              </div>

              <h2>{selectedBooth.name}</h2>
              <div className="location-subtext">
                <MapPin size={12} />
                <span>
                  {selectedLocation.location} · {formatDistance(selectedDistance)}
                </span>
              </div>
              {selectedBooth.operatingHours && (
                <div className="booth-hours-line">◷ {selectedBooth.operatingHours}</div>
              )}

              {selectedBooth.description && <p className="booth-desc-paragraph">{selectedBooth.description}</p>}

              <div className="hanji-details-block">
                {selectedBooth.menu && selectedBooth.menu.length > 0 && (
                  <div className="detail-section-box">
                    <h4>❖ MENU</h4>
                    <div className="menu-list-items">
                      {selectedBooth.menu.map((item, idx) => (
                        <div key={idx} className="menu-item-row">
                          <span>• {item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBooth.events && selectedBooth.events.length > 0 && (
                  <div className="detail-section-box">
                    <h4>❖ EVENT</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#1c2742' }}>
                      {selectedBooth.events.join(' · ')}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  className="directions-nav-btn"
                  onClick={() => { setSelectedBooth(selectedBooth); setTab('map') }}
                >
                  <MapPin size={15} /> 지도에서 위치 보기
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* 💻 Desktop PC Layout */}
      <div className="desktop-app-layout">
        {/* Left Sidebar */}
        <aside className="desktop-sidebar">
          <div>
            <button className="sidebar-header-brand brand-home-button" onClick={() => { setTab('map'); setSelectedBooth(null) }} aria-label="홈으로">
              <h1>青月宴</h1>
              <small>2026 청파제</small>
              <p>달빛 아래, 우리의 청춘을 채웁니다.</p>
            </button>

            <nav className="desktop-nav-menu">
              <button
                className={`desktop-nav-item ${tab === 'map' ? 'active' : ''}`}
                onClick={() => setTab('map')}
              >
                <Compass size={18} /> 축제 지도
              </button>
              <button
                className={`desktop-nav-item ${tab === 'schedule' ? 'active' : ''}`}
                onClick={() => setTab('schedule')}
              >
                <CalendarDays size={18} /> 공연 일정
              </button>
              <button
                className={`desktop-nav-item ${tab === 'nearby' ? 'active' : ''}`}
                onClick={() => setTab('nearby')}
              >
                <LocateFixed size={18} /> 내 주변
              </button>
              <button
                className={`desktop-nav-item ${tab === 'more' ? 'active' : ''}`}
                onClick={() => setTab('more')}
              >
                <Sparkles size={18} /> 더보기
              </button>
            </nav>
          </div>

          <div className="sidebar-mascot-footer">
            <img src={assets.welcome} alt="눈송이" className="sidebar-mascot-img" />
            <div className="sidebar-mascot-text font-serif">
              "달빛이 비추는 곳마다,<br />즐거움이 있어요."
            </div>
          </div>
        </aside>

        {/* Center Main Area */}
        <main className="desktop-center-area">
          {/* Top Bar Filter & Search */}
          <div className="desktop-topbar">
            <div className="topbar-pills-group">
              {tab === 'map' ? (
                <div className="campus-switch" aria-label="캠퍼스 선택">
                  <button className={campus === 'campus1' ? 'active' : ''} onClick={() => setCampus('campus1')}>1캠퍼스</button>
                  <button className={campus === 'campus2' ? 'active' : ''} onClick={() => setCampus('campus2')}>2캠퍼스</button>
                </div>
              ) : tab === 'schedule' ? (
                <DaySwitcher day={day} setDay={setDay} compact />
              ) : null}
            </div>

            <div className="desktop-search-box">
              <Search size={16} color="#7fa0d8" />
              <input
                type="text"
                placeholder="부스 이름, 키워드로 검색해보세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X size={14} color="#7fa0d8" />
                </button>
              )}
              {searchQuery.trim() && (
                <div className="search-results-popover">
                  {searchResults.length ? searchResults.map(({ booth, location }) => (
                    <button key={booth.id} type="button" onClick={() => { rememberBooth(booth); setTab('map'); setSearchQuery('') }}>
                      <span>{booth.name}</span><small>{booth.category || '부스'} · {location.location}</small>
                    </button>
                  )) : <div className="search-empty">검색 결과가 없습니다.</div>}
                </div>
              )}
            </div>
          </div>

          {/* Center Dynamic Content */}
          {tab === 'map' && (
            <div className="map-home-shell">
              <VectorCampusMapView
                campus={campus}
                day={day}
                setDay={setDay}
                visibleItems={visibleItems}
                selectedBooth={selectedBooth}
                setSelectedBooth={setSelectedBooth}
                status={status}
                coords={coords}
                requestLocation={requestLocation}
              />
            </div>
          )}

          {tab === 'schedule' && (
            <div className="desktop-center-content">
              <div className="view-heading schedule-heading">
                <p>LIVE & STAGE</p>
                <h2>공연 / 행사 일정</h2>
                <small>DAY를 먼저 고르고 오늘의 무대를 확인하세요.</small>
              </div>
              <ArtistLineup day={day} />
              <div className="timeline-list">
                {schedules
                  .filter((s) => s.date === day)
                  .map((item) => {
                    const isCurrentActive = isEventActive(item.date, item.time)
                    return (
                      <div key={`${item.date}-${item.time}-${item.title}`} className={`timeline-item ${isCurrentActive ? 'active' : ''}`}>
                        <div className="timeline-time">{item.time}</div>
                        <div className="timeline-axis">
                          <div className="timeline-node" />
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header-row">
                            <strong>{item.title}</strong>
                            {isCurrentActive && <span className="timeline-active-badge">현재 진행 중</span>}
                          </div>
                          <small>
                            <MapPin size={12} /> {item.place}
                          </small>
                          {item.description && <p className="timeline-description">{item.description}</p>}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {tab === 'nearby' && (
            <div className="desktop-center-content">
              <div className="view-heading">
                <p>내 주변</p>
                <h2>내 주변 부스</h2>
                <small>
                  {status === 'loading' 
                    ? '위치를 확인하는 중입니다...'
                    : coords 
                    ? '현재 위치 기준 가까운 순서' 
                    : '위치를 허용하면 가까운 부스를 찾을 수 있습니다'}
                </small>
              </div>
              {recentBooths.length > 0 && (
                <section className="recent-booths-section" aria-label="최근 본 부스">
                  <div className="recent-booths-heading">
                    <span>RECENT</span>
                    <strong>최근 본 부스</strong>
                  </div>
                  <div className="recent-booths-list">
                    {recentBooths.map((booth) => {
                      const location = locations.find((item) => item.id === booth.locationId)
                      if (!location) return null
                      return (
                        <button key={booth.id} type="button" className="recent-booth-chip" onClick={() => { rememberBooth(booth); setTab('map') }}>
                          <span>{location.code}</span>
                          <strong>{booth.name}</strong>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}
              <div className="nearby-toolbar">
                <div className="nearby-filter-row" role="tablist" aria-label="부스 카테고리 필터">
                  {([
                    ['all', '전체'],
                    ['food', '음식'],
                    ['experience', '체험'],
                    ['store', '상점'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`nearby-filter-chip ${nearbyFilter === key ? 'active' : ''}`}
                      onClick={() => setNearbyFilter(key)}
                    >{label}</button>
                  ))}
                </div>
                <button className="location-permission-btn" onClick={requestLocation} disabled={status === 'loading'}>
                  <LocateFixed size={13} />
                  <span>{status === 'loading' ? '확인 중' : coords ? '위치 새로고침' : '위치 권한'}</span>
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px', marginTop: '12px' }}>
                {nearbyDisplayItems.map(({ booth, location, distance, locationCodes }) => {
                  const CategoryIcon = getCategoryIcon(booth.category)
                  return (
                    <button
                      key={booth.id}
                      className="booth-list-card"
                      onClick={() => { rememberBooth(booth); setTab('map') }}
                    >
                      {distance !== undefined && <div className="booth-distance-tag">{formatDistance(distance)}</div>}
                      <div className="booth-thumb-avatar">
                        <CategoryIcon size={16} />
                      </div>
                      <div className="booth-info-text">
                        <b>{booth.name}</b>
                        <small>
                          {(locationCodes || [location.code]).join(' · ')} · {booth.category}
                        </small>
                      </div>
                      <ChevronRight size={16} color="#a1b2d4" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'more' && (
            <div className="desktop-center-content info-page-container">
              <div className="view-heading">
                <p>INFORMATION</p>
                <h2>축제 및 연회 안내</h2>
              </div>
              <FestivalInfo compact />
            </div>
          )}
        </main>

        {/* Right Panel (Booths List & Detail Hanji Card) */}
        <section className={`desktop-right-panel ${!selectedBooth ? 'desktop-right-panel-hidden' : ''}`} onClick={() => selectedBooth && setSelectedBooth(null)}>
          {selectedBooth && selectedLocation ? (
            /* Selected Booth Sleek Compact Detail Card Panel */
            <div className="hanji-card-panel" style={{ padding: '18px' }} onClick={(event) => event.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div className="hanji-card-meta" style={{ margin: 0 }}>
                  <span className="code-pill-tag">{selectedLocation.code}</span>
                  <span className="category-tag">{selectedBooth.category}</span>
                </div>
                <button
                  onClick={() => setSelectedBooth(null)}
                  style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '11px', color: '#666', background: 'rgba(0,0,0,0.06)' }}
                >
                  닫기
                </button>
              </div>

              <div className="detail-hero-art">
                <img src="/assets/decoration/crescent-moon-20260915-040004.png" alt="" />
                <img className="detail-hero-mascot" src={assets.mapMascot} alt="" />
                <div>
                  <span>{selectedLocation.code}</span>
                  <strong>청파제 부스</strong>
                </div>
              </div>
              <h2 style={{ fontSize: '20px', margin: '4px 0' }}>{selectedBooth.name}</h2>
              <div className="location-subtext" style={{ fontSize: '11px', marginBottom: '6px' }}>
                <MapPin size={12} />
                <span>
                  {selectedLocation.location} · {formatDistance(selectedDistance)}
                </span>
              </div>
              {selectedBooth.operatingHours && (
                <div className="booth-hours-line">◷ {selectedBooth.operatingHours}</div>
              )}

              {selectedBooth.description && (
                <p className="booth-desc-paragraph" style={{ fontSize: '12px', marginBottom: '14px' }}>
                  {selectedBooth.description}
                </p>
              )}

              <div className="hanji-details-block" style={{ flex: 1 }}>
                {selectedBooth.menu && selectedBooth.menu.length > 0 && (
                  <div className="detail-section-box" style={{ padding: '10px 12px' }}>
                    <h4 style={{ fontSize: '10px', marginBottom: '4px' }}>❖ MENU</h4>
                    <div className="menu-list-items">
                      {selectedBooth.menu.map((item, idx) => (
                        <div key={idx} className="menu-item-row" style={{ fontSize: '12px' }}>
                          <span>• {item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBooth.events && selectedBooth.events.length > 0 && (
                  <div className="detail-section-box" style={{ padding: '10px 12px' }}>
                    <h4 style={{ fontSize: '10px', marginBottom: '4px' }}>❖ EVENT</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#1c2742' }}>
                      {selectedBooth.events.join(' · ')}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  className="directions-nav-btn"
                  onClick={() => {
                  setSelectedBooth(selectedBooth)
                  setTab('map')
                }}
                >
                  <MapPin size={14} /> 지도에서 위치 보기
                </button>
              </div>

            </div>
          ) : null}        </section>
      </div>
    </>
  )
}

