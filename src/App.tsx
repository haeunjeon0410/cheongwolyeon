import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronRight,
  Compass,
  Gamepad2,
  LocateFixed,
  MapPin,
  Music2,
  ExternalLink,
  Search,
  Camera,
  FerrisWheel,
  ShoppingBag,
  Sparkles,
  Users,
  Utensils,
  X,
} from 'lucide-react'
import { booths, locations, schedules } from './data'
import { artists, foodTrucks, notices, sponsors, rides, photoBooths, hanbokRental, stampProgram, stageMC, guideLinks } from './eventData'
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

function displayCategory(category?: string) {
  return category?.replace(/상점/g, '굿즈') || ''
}

const assets = {
  welcome: '/assets/mascot/nunsongi-welcome-20260915-040013.png',
  mapMascot: '/assets/mascot/nunsongi-map-20260915-040604.png',
  emptyMascot: '/assets/mascot/nunsongi-empty-20260915-040613.png',
  lanternMarker: '/assets/markers/lantern-marker-20260915-040004.png',
}

// Android에서 Instagram 게시물 링크가 instagram://media/...로 딥링크되며
// 현재 브라우저/웹뷰에서 ERR_UNKNOWN_URL_SCHEME이 나는 경우를 피합니다.
// 모바일에서는 Instagram의 웹용 embed 페이지를 열어 게시물을 그대로 보여줍니다.
function getExternalPromoUrl(url?: string) {
  if (!url) return ''
  const isInstagramPost = /^https?:\/\/(www\.)?instagram\.com\/p\//i.test(url)
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
  if (isInstagramPost && isAndroid && !/\/embed(?:\/captioned)?\/?$/i.test(url)) {
    return `${url.replace(/\/$/, '')}/embed/captioned/`
  }
  return url
}

function BoothPromoLinks({ booth }: { booth: Booth }) {
  // 인스타 홍보글이 있으면 인스타를 우선 사용하고,
  // 인스타가 없는 경우에만 에브리타임 링크를 사용합니다.
  const instagram = booth.promoLinks?.instagram
  const everytime = booth.promoLinks?.everytime
  const promoUrl = getExternalPromoUrl(instagram || everytime)
  if (!promoUrl) return null

  const isInstagram = Boolean(instagram)

  return (
    <div className="booth-promo-links">
      <a className={`booth-promo-btn ${isInstagram ? 'instagram' : 'everytime'}`} href={promoUrl} target="_blank" rel="noreferrer">
        {isInstagram ? (
          <svg className="instagram-mark" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="17.3" cy="6.8" r="1.1" fill="currentColor" />
          </svg>
        ) : <span className="everytime-mark">E</span>}
        <span>홍보글 보러가기</span>
        <ExternalLink size={13} />
      </a>
    </div>
  )
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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const introImages = [
      '/assets/decoration/stars-20260915-040004.png',
      '/assets/decoration/cloud-long-20260915-040004.png',
      '/assets/decoration/cloud-small-20260915-040021.png',
      '/assets/decoration/full-moon-20260915-040004.png',
      '/assets/decoration/moonlight-halo-20260915-040023.png',
      '/assets/decoration/lantern-hanging-20260915-040004.png',
      '/assets/decoration/lantern-hand-20260915-040026.png',
      assets.emptyMascot,
    ]

    let cancelled = false
    const preload = async () => {
      await Promise.all(introImages.map((src) => new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = () => resolve()
        img.src = src
        if (img.decode) img.decode().catch(() => {})
      })))
      if (!cancelled) {
        setReady(true)
        window.setTimeout(onEnter, 4200)
      }
    }
    preload()

    return () => {
      cancelled = true
    }
  }, [onEnter])

  return (
    <div className={`festival-intro ${ready ? 'is-ready' : ''}`} role="dialog" aria-modal="true" aria-label="청월연 축제 안내">
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
        <p className="intro-copy"><span>푸른 달빛이 비추는 숙명의 지나온 120년,</span><span>그리고 앞으로 걸어갈 달</span></p>
        <div className="intro-continue">9.16 WED — 9.17 THU · 숙명여자대학교</div>
      </div>
    </div>
  )
}

function FestivalInfo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`festival-info ${compact ? 'compact' : ''}`}>
      <section className="info-card concept-card">
        <img src={assets.welcome} alt="" className="concept-mascot" />
        <div className="info-card-title"><span>CONCEPT</span><strong>청월연 이야기</strong></div>
        <div className="concept-copy">
          <p><strong>청월(靑月)</strong>은 숙명의 120년을 지켜본 시간의 기록이자, 앞으로 나아갈 미래를 비추는 달을 의미합니다.</p>
          <p>과거와 미래가 만나는 2026년, 숙명인들은 지나온 역사를 돌아보고 오늘의 우리를 기념하며 하나의 연회를 엽니다.</p>
        </div>
        <div className="concept-campus-grid">
          <div><span>01</span><strong>소월당 蘇月堂</strong><p>지나온 120년의 발자취와 기억이 머무는 공간입니다.</p></div>
          <div><span>02</span><strong>금월관 今月館</strong><p>지금 이 순간, 각자의 자리에서 빛나는 오늘의 우리를 비추는 공간입니다.</p></div>
        </div>
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
        <div className="info-card info-link-card">
          <div className="info-card-title info-link-title">
            <div><span>FOOD</span><strong>푸드트럭</strong></div>
            <a className="info-icon-link" href={getExternalPromoUrl(guideLinks.foodTrucks)} target="_blank" rel="noreferrer" aria-label="푸드트럭 인스타그램 열기">
              <Utensils size={15} strokeWidth={1.8} />
            </a>
          </div>
          <p className="info-muted">순헌사거리 · 11:00 — 22:00</p>
          <div className="mini-tag-list">{foodTrucks.map((item) => <span key={item.id}>{item.name}</span>)}</div>
        </div>
        <div className="info-card info-link-card">
          <div className="info-card-title info-link-title">
            <div><span>PLAY</span><strong>즐길거리</strong></div>
            <div className="info-icon-links">
              <a className="info-icon-link" href={getExternalPromoUrl(guideLinks.rides)} target="_blank" rel="noreferrer" aria-label="놀이기구 인스타그램 열기">
                <FerrisWheel size={15} strokeWidth={1.8} />
              </a>
              <a className="info-icon-link" href={getExternalPromoUrl(guideLinks.photoBooths)} target="_blank" rel="noreferrer" aria-label="포토부스 인스타그램 열기">
                <Camera size={15} strokeWidth={1.8} />
              </a>
            </div>
          </div>
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
          {sponsors.map((sponsor) => (
            <div key={sponsor.id} className="sponsor-item">
              <div className="sponsor-copy">
                <b>{sponsor.name}</b>
                <p>{sponsor.description}</p>
              </div>
              {sponsor.link && (
                <a className="sponsor-link" href={getExternalPromoUrl(sponsor.link)} target="_blank" rel="noreferrer" aria-label={`${sponsor.name} ${sponsor.linkLabel || '링크'} 열기`}>
                  <span>{sponsor.linkLabel || '보기'}</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          ))}
        </div>
        <div className="hanbok-note">
          <div className="hanbok-note-copy"><b>한복 대여</b><span>{hanbokRental.location} · {hanbokRental.hours}</span></div>
          <a className="sponsor-link hanbok-link" href={getExternalPromoUrl(hanbokRental.link)} target="_blank" rel="noreferrer" aria-label={`한복 대여 ${hanbokRental.linkLabel || '링크'} 열기`}>
            <span>{hanbokRental.linkLabel || '보기'}</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </section>


    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<'map' | 'nearby' | 'schedule' | 'more'>('map')
  const [selectedSchedule, setSelectedSchedule] = useState<(typeof schedules)[number] | null>(null)
  const [scheduleMode, setScheduleMode] = useState<'stage' | 'busking'>('stage')
  const [campus, setCampus] = useState<Campus>('campus1')
  const [day, setDay] = useState<Day>('day1')
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null)
  const [lastViewedBooth, setLastViewedBooth] = useState<Booth | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [nearbyFilter, setNearbyFilter] = useState<'all' | 'food' | 'experience' | 'store'>('all')
  // 현재 브라우저 세션에서 처음 한 번만 인트로를 보여준다.
  // 새로고침이나 뒤로가기/앞으로가기로 앱이 다시 마운트되어도 다시 뜨지 않는다.
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('cheongpa-intro-seen') !== '1'
  })
  const dismissIntro = () => {
    localStorage.setItem('cheongpa-intro-seen', '1')
    setShowIntro(false)
  }



  const { position, status, requestLocation, setPosition } = useGeolocation()
  const coords = position?.coords

  useEffect(() => {
    if (tab === 'nearby' && status === 'idle') requestLocation()
  }, [tab, status, requestLocation])

  useEffect(() => {
    if (selectedBooth) {
      setLastViewedBooth(selectedBooth)
    }
  }, [selectedBooth])

  // 부스 상세정보는 날짜별 위치 데이터와 분리해서 사용한다.
  // 같은 부스가 양일에 올라온 경우, 현재 날짜 레코드에 일부 정보가 비어 있어도
  // 다른 날짜의 동일 부스에 있는 상세정보를 보완해서 보여준다.
  const normalizeBoothName = (name = '') => name.replace(/[^0-9a-zA-Z가-힣]/g, '').toLowerCase()
  const mergeBoothDetails = (booth: Booth) => {
    const key = normalizeBoothName(booth.name)
    if (!key) return booth
    const candidates = booths.filter((other) => {
      if (other.id === booth.id || other.locationId !== booth.locationId) return false
      const otherKey = normalizeBoothName(other.name)
      return otherKey === key || (key.includes('청명') && otherKey.includes('청명')) || (key.includes('향영') && otherKey.includes('향영'))
    })
    const richer = [...candidates].sort((a, b) => {
      const score = (item: Booth) => [item.description, item.menu?.length, item.events?.length, item.operatingHours, item.promoLinks?.instagram || item.promoLinks?.everytime].filter(Boolean).length
      return score(b) - score(a)
    })[0]
    if (!richer) return booth
    return {
      ...richer,
      ...booth,
      description: booth.description || richer.description,
      category: booth.category || richer.category,
      menu: booth.menu?.length ? booth.menu : richer.menu,
      events: booth.events?.length ? booth.events : richer.events,
      operatingHours: booth.operatingHours || richer.operatingHours,
      posterImage: booth.posterImage || richer.posterImage,
      posterImages: booth.posterImages?.length ? booth.posterImages : richer.posterImages,
      promoLinks: { ...richer.promoLinks, ...booth.promoLinks },
    }
  }

  // 배치도에 있는 2캠퍼스 E01~E20은 상세정보가 없어도 모든 칸을 지도에서 선택할 수 있게 한다.
  // 지도에 실제로 표시하는 목록은 현재 선택한 캠퍼스로 제한한다.
  const allDayItems = useMemo(() => {
    const dayBooths = booths.filter((b) => b.date === day)
    const items = locations.map((location) => {
      const candidates = dayBooths.filter((b) => b.locationId === location.id)
      const booth = candidates[0]
      if (booth) return { booth: mergeBoothDetails(booth), location }

      // 2캠퍼스 E01~E20처럼 상세정보가 없는 배치도 칸도 지도에서 선택 가능하게 한다.
      if (location.campus === 'campus2') {
        return {
          booth: {
            id: `layout-${day}-${location.id}`,
            locationId: location.id,
            date: day,
            name: `${location.code} 부스`,
            description: '상세 정보는 아직 준비 중입니다.',
          } as Booth,
          location,
        }
      }

      return null
    }).filter(Boolean) as Array<{ booth: Booth; location: typeof locations[number] }>

    return items
  }, [day])

  // 지도만 1/2캠퍼스 선택 상태를 따르고, 검색은 양 캠퍼스 전체를 검색한다.
  const visibleItems = useMemo(
    () => allDayItems.filter((item) => item.location.campus === campus),
    [allDayItems, campus]
  )

  const searchResults = useMemo(() => {
    const q = normalizeSearchText(searchQuery)
    if (!q) return []
    const searched = allDayItems.filter((item) => {
      const haystack = normalizeSearchText([
        item.booth.name, item.booth.category, item.booth.description,
        item.booth.menu?.join(' '), item.booth.events?.join(' '),
        item.location.code, item.location.location,
      ].filter(Boolean).join(' '))
      return haystack.includes(q)
    })
    return groupBoothItems(searched).slice(0, 6)
  }, [allDayItems, searchQuery])

  // 내 주변은 캠퍼스 선택과 무관하게 현재 날짜의 전체 부스를 거리순으로 보여준다.
  const nearbyItems = useMemo(() => {
    return allDayItems
      .map((item) => ({
        ...item,
        distance: coords
          ? distanceInMeters(coords.latitude, coords.longitude, item.location.latitude, item.location.longitude)
          : undefined,
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
  }, [allDayItems, coords])

  const nearbyDisplayItems = useMemo(() => {
    const filtered = nearbyFilter === 'all' ? nearbyItems : nearbyItems.filter(({ booth }) => {
      const category = booth.category || ''
      if (nearbyFilter === 'food') return category.includes('음식') || category.includes('먹거리')
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
          <div className="mobile-search-overlay">
            <div className="desktop-search-box mobile-search-box">
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
                    <button key={booth.id} type="button" onClick={() => { setSelectedBooth(booth); setCampus(locations.find((l) => l.id === booth.locationId)?.campus || 'campus1'); setTab('map'); setSearchQuery(''); setIsSearchOpen(false) }}>
                      <span>{booth.name}</span><small>{displayCategory(booth.category) || '부스'} · {location.location}</small>
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
                  lastViewedBooth={lastViewedBooth}
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
                {status === 'loading' ? '위치를 확인하는 중입니다...' : !coords ? '위치를 허용하면 가까운 부스를 찾을 수 있습니다' : ''}
              </small>
            </div>

            <div className="nearby-toolbar">
              <div className="nearby-filter-row" role="tablist" aria-label="부스 카테고리 필터">
                {([
                  ['all', '전체'],
                  ['food', '음식'],
                  ['experience', '체험'],
                  ['store', '굿즈'],
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
                  onClick={() => { setSelectedBooth(booth); setCampus(locations.find((l) => l.id === booth.locationId)?.campus || 'campus1'); setTab('map') }}
                >
                  {distance !== undefined && <div className="booth-distance-tag">{formatDistance(distance)}</div>}
                  <div className="booth-thumb-avatar">
                    <CategoryIcon size={20} />
                  </div>
                  <div className="booth-info-text">
                    <b>{booth.name}</b>
                    <small>
                      {displayCategory(booth.category)} · {location.location}
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
            <div className="schedule-mode-switch" role="tablist" aria-label="공연 종류 선택">
              <button type="button" className={scheduleMode === 'stage' ? 'active' : ''} onClick={() => setScheduleMode('stage')}>MAIN STAGE</button>
              <button type="button" className={scheduleMode === 'busking' ? 'active' : ''} onClick={() => setScheduleMode('busking')}>버스킹</button>
            </div>

            {scheduleMode === 'stage' && <ArtistLineup day={day} />}

            {scheduleMode === 'stage' && (
              <div className="schedule-mc-card">
                <div className="schedule-mc-icon"><Music2 size={16} /></div>
                <div>
                  <span>STAGE MC</span>
                  <strong>{stageMC.name}</strong>
                  <p>{stageMC.description}</p>
                </div>
              </div>
            )}

            <div className="schedule-mode-caption">
              {scheduleMode === 'stage' ? '무대 공연 라인업' : '버스킹 공연 라인업'}
            </div>
            <div className="timeline-list">
              {schedules
                .filter((s) => s.date === day && (scheduleMode === 'stage' ? s.title === '무대 공연' : s.title.startsWith('버스킹')))
                .map((item) => {
                  const isCurrentActive = isEventActive(item.date, item.time)
                  const performers = item.description?.split(' · ') ?? []
                  return (
                    <div key={`${item.date}-${item.time}-${item.title}`} className={`timeline-item timeline-item-clickable ${isCurrentActive ? 'active' : ''}`} role="button" tabIndex={0}
                      onClick={() => setSelectedSchedule(item)}
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedSchedule(item) } }}
                      aria-label={`${item.title} 상세 보기`}>
                      <div className="timeline-time">{item.time}</div>
                      <div className="timeline-axis"><div className="timeline-node" /></div>
                      <div className="timeline-content">
                        <div className="timeline-header-row"><strong>{item.title}</strong>{isCurrentActive && <span className="timeline-active-badge">현재 진행 중</span>}</div>
                        <small><MapPin size={12} /> {item.place}</small>
                        <div className={`schedule-performer-list ${scheduleMode === 'busking' ? 'busking-performer-list' : ''}`}>
                          {performers.map((name, index) => <span key={`${name}-${index}`}><b>{index + 1}</b>{name}</span>)}
                        </div>
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
            <div className="view-heading info-view-heading">
              <div className="info-heading-row">
                <div>
                  <p>INFORMATION</p>
                  <h2>축제 안내</h2>
                </div>
              </div>
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
                {selectedBooth.category && <span className="category-tag">{displayCategory(selectedBooth.category)}</span>}
              </div>

              <div className="detail-hero-art">
                <img src="/assets/decoration/crescent-moon-20260915-040004.png" alt="" />
                <img className="detail-hero-mascot" src={assets.mapMascot} alt="" />
                <div>
                  <span>{selectedLocation.code}</span>
                  <strong>{selectedBooth.name}</strong>
                </div>
              </div>

              {selectedBooth.operatingHours && (
                <div className="booth-hours-line">◷ {selectedBooth.operatingHours}</div>
              )}

              {selectedBooth.description && <p className="booth-desc-paragraph">{selectedBooth.description}</p>}
              {!selectedBooth.description && !selectedBooth.menu?.length && !selectedBooth.events?.length && !selectedBooth.operatingHours && (
                <p className="booth-info-pending">상세 정보가 준비 중입니다.</p>
              )}

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

                <BoothPromoLinks booth={selectedBooth} />

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
              <p>숙명의 지나온 120년,<br /> 그리고 앞으로 걸어갈 달</p>
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
                    <button key={booth.id} type="button" onClick={() => { setSelectedBooth(booth); setCampus(locations.find((l) => l.id === booth.locationId)?.campus || 'campus1'); setTab('map'); setSearchQuery('') }}>
                      <span>{booth.name}</span><small>{displayCategory(booth.category) || '부스'} · {location.location}</small>
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
                lastViewedBooth={lastViewedBooth}
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
              </div>
              <div className="schedule-mode-switch desktop-schedule-mode-switch" role="tablist" aria-label="공연 종류 선택">
                <button type="button" className={scheduleMode === 'stage' ? 'active' : ''} onClick={() => setScheduleMode('stage')}>MAIN STAGE</button>
                <button type="button" className={scheduleMode === 'busking' ? 'active' : ''} onClick={() => setScheduleMode('busking')}>버스킹</button>
              </div>
              {scheduleMode === 'stage' && <ArtistLineup day={day} />}
              {scheduleMode === 'stage' && <div className="schedule-mc-card desktop-schedule-mc-card"><div className="schedule-mc-icon"><Music2 size={16} /></div><div><span>STAGE MC</span><strong>{stageMC.name}</strong><p>{stageMC.description}</p></div></div>}
              <div className="schedule-mode-caption">{scheduleMode === 'stage' ? '무대 공연 라인업' : '버스킹 공연 라인업'}</div>
              <div className="timeline-list">
                {schedules.filter((s) => s.date === day && (scheduleMode === 'stage' ? s.title === '무대 공연' : s.title.startsWith('버스킹'))).map((item) => {
                  const isCurrentActive = isEventActive(item.date, item.time)
                  const performers = item.description?.split(' · ') ?? []
                  return <div key={`${item.date}-${item.time}-${item.title}`} className={`timeline-item timeline-item-clickable ${isCurrentActive ? 'active' : ''}`} role="button" tabIndex={0} onClick={() => setSelectedSchedule(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedSchedule(item) } }} aria-label={`${item.title} 상세 보기`}>
                    <div className="timeline-time">{item.time}</div><div className="timeline-axis"><div className="timeline-node" /></div>
                    <div className="timeline-content"><div className="timeline-header-row"><strong>{item.title}</strong>{isCurrentActive && <span className="timeline-active-badge">현재 진행 중</span>}</div><small><MapPin size={12} /> {item.place}</small><div className={`schedule-performer-list ${scheduleMode === 'busking' ? 'busking-performer-list' : ''}`}>{performers.map((name, index) => <span key={`${name}-${index}`}><b>{index + 1}</b>{name}</span>)}</div></div>
                  </div>
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
                  {status === 'loading' ? '위치를 확인하는 중입니다...' : !coords ? '위치를 허용하면 가까운 부스를 찾을 수 있습니다' : ''}
                </small>
              </div>
              <div className="nearby-toolbar">
                <div className="nearby-filter-row" role="tablist" aria-label="부스 카테고리 필터">
                  {([
                    ['all', '전체'],
                    ['food', '음식'],
                    ['experience', '체험'],
                    ['store', '굿즈'],
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
              <div className="nearby-booth-grid" style={{ marginTop: '12px' }}>
                {nearbyDisplayItems.map(({ booth, location, distance, locationCodes }) => {
                  const CategoryIcon = getCategoryIcon(booth.category)
                  return (
                    <button
                      key={booth.id}
                      className="booth-list-card"
                      onClick={() => { setSelectedBooth(booth); setCampus(locations.find((l) => l.id === booth.locationId)?.campus || 'campus1'); setTab('map') }}
                    >
                      {distance !== undefined && <div className="booth-distance-tag">{formatDistance(distance)}</div>}
                      <div className="booth-thumb-avatar">
                        <CategoryIcon size={16} />
                      </div>
                      <div className="booth-info-text">
                        <b>{booth.name}</b>
                        <small>
                          {displayCategory(booth.category)} · {location.location}
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
              <div className="view-heading info-view-heading">
                <div className="info-heading-row">
                  <div>
                    <p>INFORMATION</p>
                    <h2>축제 안내</h2>
                  </div>
                </div>
              </div>
              <FestivalInfo />
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
                  <span className="category-tag">{displayCategory(selectedBooth.category)}</span>
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
                  <strong>{selectedBooth.name}</strong>
                </div>
              </div>
              {selectedBooth.operatingHours && (
                <div className="booth-hours-line">◷ {selectedBooth.operatingHours}</div>
              )}

              {selectedBooth.description && (
                <p className="booth-desc-paragraph" style={{ fontSize: '12px', marginBottom: '14px' }}>
                  {selectedBooth.description}
                </p>
              )}
              {!selectedBooth.description && !selectedBooth.menu?.length && !selectedBooth.events?.length && !selectedBooth.operatingHours && (
                <p className="booth-info-pending">상세 정보가 준비 중입니다.</p>
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

                <BoothPromoLinks booth={selectedBooth} />

              </div>

            </div>
          ) : null}        </section>

        {selectedSchedule && (
          <div className="schedule-detail-backdrop" onClick={() => setSelectedSchedule(null)}>
            <div className="schedule-detail-modal" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="schedule-detail-close"
                onClick={() => setSelectedSchedule(null)}
                aria-label="공연 상세 닫기"
              >
                <X size={16} />
              </button>
              <div className="schedule-detail-kicker">{selectedSchedule.date === 'day1' ? 'DAY 1 · 9.16 수' : 'DAY 2 · 9.17 목'}</div>
              <h2>{selectedSchedule.title}</h2>
              <div className="schedule-detail-meta">
                <div><CalendarDays size={14} /><span>{selectedSchedule.date === 'day1' ? '9월 16일(수)' : '9월 17일(목)'}</span></div>
                <div><Music2 size={14} /><span>{selectedSchedule.time === '미정' ? '미정' : `${selectedSchedule.time} ~`}</span></div>
                <div><MapPin size={14} /><span>{selectedSchedule.place}</span></div>
              </div>
              <div className="schedule-detail-section">
                <span>PROGRAM</span>
                <div className="schedule-detail-program-list">{(selectedSchedule.description || '공연 정보는 추후 업데이트됩니다.').split(' · ').map((name, index) => <div key={`${name}-${index}`}><b>{index + 1}</b><span>{name}</span></div>)}</div>
              </div>
              <div className="schedule-detail-note">공연 시간 및 진행 내용은 현장 상황에 따라 변동될 수 있습니다.</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

