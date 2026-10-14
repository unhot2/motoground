// 카카오 지도 (Kakao Maps JavaScript SDK + 장소 검색 services 라이브러리)
// 카카오톡 공유와 같은 VITE_KAKAO_JS_KEY 를 씁니다.
// Kakao Developers 콘솔에서 '카카오맵' 사용 설정을 켜고, 플랫폼 > Web 에 사이트 도메인을 등록해야 동작합니다.
const jsKey = import.meta.env.VITE_KAKAO_JS_KEY;
const SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false&libraries=services`;

export const isKakaoMapConfigured = Boolean(jsKey);

let loading = null;

// SDK 를 처음 쓸 때 한 번만 불러옴 → window.kakao.maps
export function loadKakaoMap() {
  if (!jsKey) return Promise.reject(new Error('카카오 JavaScript 키가 설정되지 않았어요.'));
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const ready = () => window.kakao.maps.load(() => resolve(window.kakao.maps));
      if (window.kakao?.maps) return ready();
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => (window.kakao?.maps ? ready() : reject(new Error('카카오 지도를 불러오지 못했어요.')));
      script.onerror = () => {
        loading = null; // 다음에 다시 시도할 수 있게
        reject(new Error('카카오 지도를 불러오지 못했어요.'));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

// 카카오 주소의 시·도 표기('서울특별시', '경기도' 등) → 사이트에서 쓰는 짧은 이름('서울', '경기')
const LONG_SIDO = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 광주광역시: '광주',
  대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종', 경기도: '경기',
  강원도: '강원', 강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남',
  전라북도: '전북', 전북특별자치도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남',
  제주특별자치도: '제주',
};
export const sidoFromAddress = (address = '') => {
  const first = address.trim().split(/\s+/)[0] ?? '';
  return LONG_SIDO[first] ?? first;
};

// 키워드로 장소 검색 (운영자 등록 화면) → [{ id, name, address, phone, lat, lng, category }]
export async function searchKakaoPlaces(keyword) {
  const maps = await loadKakaoMap();
  const places = new maps.services.Places();
  return new Promise((resolve, reject) => {
    places.keywordSearch(keyword, (data, status) => {
      if (status === maps.services.Status.ZERO_RESULT) return resolve([]);
      if (status !== maps.services.Status.OK) return reject(new Error('장소를 검색하지 못했어요.'));
      resolve(
        data.map((d) => ({
          id: d.id,
          name: d.place_name,
          address: d.road_address_name || d.address_name,
          phone: d.phone,
          lat: Number(d.y),
          lng: Number(d.x),
          category: d.category_name,
        }))
      );
    });
  });
}
