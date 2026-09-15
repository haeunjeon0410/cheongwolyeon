import type { Artist, FoodTruck, Notice, OfficialLinks, PhotoBooth, Ride, Sponsor } from './types'

// 2026 청파제 <청월연> 공식 계정 및 문의처
export const officialLinks: OfficialLinks = {
  instagram: '@smwu2026festival',
  email: 'smwu2026festival@gmail.com',
  alumniInstagram: '@sm_alumn',
  barrierFreeEmail: 'emergency58@sookmyung.ac.kr',
  youtube: 'https://youtu.be/SJRA3g9f3VU',
}

// 무대 MC
export const stageMC = { name: '윤수빈', description: '식품영양학과 동문, OBS 기상캐스터·LCK 아나운서 출신. 2년 연속 청파제 MC.' }

// 아티스트 라인업 (공연 시간 미정)
export const artists: Artist[] = [
  { id: 'artist-d1-1', day: 'day1', name: '우아' },
  { id: 'artist-d1-2', day: 'day1', name: '스테이씨' },
  { id: 'artist-d1-3', day: 'day1', name: '최예나' },
  { id: 'artist-d2-1', day: 'day2', name: '힛지스' },
  { id: 'artist-d2-2', day: 'day2', name: '피프티피프티' },
  { id: 'artist-d2-3', day: 'day2', name: '프로미스나인', note: '멤버 지원 불참 (09/15 수정)' },
]

// 전체 안전/운영 공지 (global) + 특정 구역용(location) 안내
export const notices: Notice[] = [
  {
    id: 'notice-outsider',
    scope: 'global',
    title: '외부인 출입 통제',
    body: '학내 밀집도 관리를 위해 외부인 출입이 통제됩니다. 18시 이후 외부인 교내 입장이 전면 통제되며, 신원 확인을 위해 학생증(실물/모바일) 지참이 필요합니다.',
  },
  {
    id: 'notice-safety',
    scope: 'global',
    title: '안전 안내',
    body: '건물 내부에서 무리하게 공연을 관람할 경우 낙상사고 위험이 있습니다. 보건의료센터는 순헌관 011호(지하식당 옆)에서 09:00~22:00 운영되며, 19시 이후에는 구급차가 배치됩니다. 교내 주류 판매 및 반입은 금지됩니다.',
  },
  {
    id: 'notice-barrier-free',
    scope: 'global',
    title: '무대 공연 배리어프리',
    body: '실시간 문자 통역이 스크린에 송출되며, 무대 앞쪽에 휠체어석/일반석으로 구성된 배리어프리존이 운영됩니다(교통약자 사전 신청, 동반 1인 가능). 문의: emergency58@sookmyung.ac.kr',
  },
  {
    id: 'notice-nunsong-zone',
    scope: 'global',
    title: '눈송구역 안내',
    body: '제1캠퍼스 야외주차장 무대 공연 관람 구역으로, 2026-2 총학생회비 납부자만 입장 가능합니다. 사전신청 600명 + 현장 500명 규모. 줄서기 시간 9/16 15:00~15:30, 9/17 15:00~15:40. 입장 시 학생증+신분증 확인.',
  },
  {
    id: 'notice-reusable',
    scope: 'global',
    title: '쓰레기 없는 청파제 (다회용기)',
    body: '푸드트럭·부스에서 음식 구매 시 별도 신청 없이 다회용기(사각용기/접시/컵/커트러리)로 제공됩니다. 취식 후 캠퍼스 밖으로 가져가지 말고 교내 반납함에 반납해주세요. 반납함 위치 — 1캠퍼스: 새힘관 우측 출입구 계단 앞, 순헌관 중앙입구 좌측 앞, 학생회관 푸드트럭 앞, SEM 부스 옆 / 2캠퍼스: 눈꽃광장홀 취식존 내부, 프라임관 입구, 르네상스 플라자 앞.',
  },
]

// 협찬사 및 파트너
export const sponsors: Sponsor[] = [
  { id: 'sponsor-steambase', name: '스팀베이스', description: '스킨케어·헤어케어 브랜드. 퍼펙트 샴푸 브러쉬 협찬 — 버스킹 공연(1캠 원형극장 등)·눈송산책 참여 시 SNS 인증하고 중앙본부에서 교환권 제시 후 수령.' },
  { id: 'sponsor-alumni', name: '총동문회', description: '창학 120주년 기념 한복 대여 부스 지원 (2캠퍼스 눈꽃광장, 보증금 1만원 · 대여료 1천~5천원).' },
  { id: 'sponsor-mallang', name: '몰랑이 (윤혜지 작가)', description: '시각영상디자인과 동문이자 몰랑이 작가와의 콜라보 굿즈(달토끼몰랑 클리커, UV 스티커) 협업.' },
]

// 푸드트럭 (순헌사거리 양측, 9/16~17 11:00~22:00, 총 8대)
export const foodTrucks: FoodTruck[] = [
  { id: 'foodtruck-owl', name: '부엉이푸드', menu: ['닭꼬치'] },
  { id: 'foodtruck-daon', name: '다온푸드', menu: ['크림새우', '칠리새우'] },
  { id: 'foodtruck-young', name: '영바베큐', menu: ['목삼겹바베큐', '오리훈제'] },
  { id: 'foodtruck-daegam', name: '대감님댁', menu: ['닭강정'] },
  { id: 'foodtruck-nadri-company', name: '나드리컴퍼니', menu: ['흑돼지스테이크', '흑돼지스테이크덮밥'] },
  { id: 'foodtruck-nadri', name: '나드리', menu: ['야끼소바', '오코노미야끼', '타코야끼'] },
  { id: 'foodtruck-soft', name: '소프트럭', menu: ['아이스크림', '츄러스', '아이스크림 츄러스'] },
  { id: 'foodtruck-jeongseong', name: '정성초밥', menu: ['불초밥', '연어초밥'] },
]

// 놀이기구 (1캠퍼스 순헌관 사거리, 9/16~17 11:00~19:00, 18:30 대기 마감)
export const rides: Ride[] = [
  { id: 'ride-minibaking', name: '미니바이킹', location: '제1캠퍼스 순헌관 사거리 동측', hours: '11:00~19:00 (18:30 대기 마감)', capacity: '최대 20인' },
  { id: 'ride-vr', name: 'VR 시뮬레이터', location: '제1캠퍼스 순헌관 사거리 서측', hours: '11:00~19:00 (18:30 대기 마감)', capacity: '최대 4인' },
]

// 포토부스 (09.14~09.18 운영)
export const photoBooths: PhotoBooth[] = [
  { id: 'photo-c1-round', campus: 'campus1', location: '원형극장', hours: '09.14(월)~09.18(금)', count: 2 },
  { id: 'photo-c2-prime', campus: 'campus2', location: '프라임관 B1 로비', hours: '09.14(월)~09.18(금)', count: 2 },
  { id: 'photo-c2-hall', campus: 'campus2', location: '눈꽃광장홀', hours: '09.14(월)~09.18(금)', count: 2 },
]

// 한복 대여 부스 (총동문회 협업)
export const hanbokRental = {
  location: '제2캠퍼스 눈꽃광장',
  hours: '9/16~9/17 10:00~16:30 (대여는 16:00 마감)',
  deposit: '보증금 10,000원',
  fee: '총학생회비 납부자 1,000원 / 미납부자 5,000원',
  duration: '환복 시간 제외 30분 (총동문회 인스타 @sm_alumn 팔로우 인증 시 15분 연장)',
}

// 눈송 발자국 스탬프 프로그램 (메인 부스: 소월당, 1캠퍼스 순헌사거리)
export const stampProgram = {
  name: '청월연 눈송 발자국',
  mainBooth: '제1캠퍼스 순헌사거리 메인부스 <소월당>',
  hours: '9/16, 17 10:00~16:00',
  stamps: [
    { name: '초승', place: '희락당 (과거관)' },
    { name: '상현', place: '규수문방(1일차) · 화첩전(2일차)' },
    { name: '보름', place: '청월연화' },
    { name: '하현', place: '설화관 (1906 포토헌트)' },
    { name: '그믐', place: '희락당 (현대관)' },
  ],
  rewards: [
    { stamps: 2, reward: '달을 품은 눈덩이 부채' },
    { stamps: 4, reward: '로로의 산수화 노리개 키링' },
    { stamps: 5, reward: '액막이 눈송이 (월인첩 완성)' },
  ],
}
