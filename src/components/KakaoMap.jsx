import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { isKakaoMapConfigured, loadKakaoMap } from '../lib/kakaoMap.js';

// 장소 핀을 찍는 카카오 지도
// places: [{ id, name, lat, lng }] / selectedId 고른 핀 강조 / onSelect(id) 핀을 눌렀을 때
// myPos: { lat, lng } 내 위치 표시 / zoom: 장소가 하나일 때 확대 단계 (작을수록 가까이)
export default function KakaoMap({ places, selectedId = null, onSelect, myPos = null, zoom = 4, className = '' }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const pinsRef = useRef(new Map()); // id → { overlay, el }
  const meRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [state, setState] = useState(isKakaoMapConfigured ? 'loading' : 'nokey');

  // 지도 만들기 (한 번)
  useEffect(() => {
    if (!isKakaoMapConfigured) return undefined;
    let alive = true;
    let observer;
    loadKakaoMap()
      .then((maps) => {
        if (!alive || !boxRef.current) return;
        mapRef.current = new maps.Map(boxRef.current, { center: new maps.LatLng(37.5665, 126.978), level: 8 });
        mapRef.current.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
        // 화면 크기가 바뀌면 지도도 다시 맞춤
        observer = new ResizeObserver(() => mapRef.current?.relayout());
        observer.observe(boxRef.current);
        setState('ready');
      })
      .catch((err) => {
        console.error(err);
        if (alive) setState('error');
      });
    return () => {
      alive = false;
      observer?.disconnect();
    };
  }, []);

  // 핀 다시 찍기 + 모든 핀이 보이게 범위 맞추기
  const key = places.map((p) => `${p.id}:${p.lat}:${p.lng}`).join('|');
  useEffect(() => {
    if (state !== 'ready') return;
    const maps = window.kakao.maps;
    const map = mapRef.current;
    pinsRef.current.forEach(({ overlay }) => overlay.setMap(null));
    pinsRef.current = new Map();

    const located = places.filter((p) => p.lat != null && p.lng != null);
    const bounds = new maps.LatLngBounds();
    located.forEach((p) => {
      const position = new maps.LatLng(p.lat, p.lng);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'place-pin';
      el.setAttribute('aria-label', p.name);
      el.innerHTML = '<span class="place-pin__dot"></span><span class="place-pin__name"></span>';
      el.querySelector('.place-pin__name').textContent = p.name; // 이름은 글자로만 넣음
      el.addEventListener('click', () => onSelectRef.current?.(p.id));
      const overlay = new maps.CustomOverlay({ position, content: el, yAnchor: 1, clickable: true });
      overlay.setMap(map);
      pinsRef.current.set(p.id, { overlay, el });
      bounds.extend(position);
    });

    if (located.length === 1) {
      map.setLevel(zoom);
      map.setCenter(new maps.LatLng(located[0].lat, located[0].lng));
    } else if (located.length > 1) {
      map.setBounds(bounds, 40, 40, 40, 40);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, key]);

  // 고른 핀 강조 (화면 밖에 있을 때만 지도를 옮김 — 목록에 마우스를 올릴 때 지도가 흔들리지 않게)
  useEffect(() => {
    if (state !== 'ready') return;
    pinsRef.current.forEach(({ overlay, el }, id) => {
      const on = id === selectedId;
      el.classList.toggle('is-active', on);
      overlay.setZIndex(on ? 10 : 1);
      if (on && !mapRef.current.getBounds().contain(overlay.getPosition())) mapRef.current.panTo(overlay.getPosition());
    });
  }, [state, selectedId, key]);

  // 내 위치
  useEffect(() => {
    if (state !== 'ready') return;
    const maps = window.kakao.maps;
    meRef.current?.setMap(null);
    meRef.current = null;
    if (!myPos) return;
    const el = document.createElement('span');
    el.className = 'place-me';
    el.title = '내 위치';
    meRef.current = new maps.CustomOverlay({ position: new maps.LatLng(myPos.lat, myPos.lng), content: el, zIndex: 20 });
    meRef.current.setMap(mapRef.current);
    mapRef.current.panTo(new maps.LatLng(myPos.lat, myPos.lng));
  }, [state, myPos]);

  return (
    <div className={`place-map ${className}`.trim()}>
      <div ref={boxRef} className="place-map__canvas" />
      {state !== 'ready' && (
        <div className="place-map__notice">
          <Icon name="pin" size={28} />
          {state === 'loading' && <span>지도를 불러오는 중…</span>}
          {state === 'nokey' && <span>카카오 지도 키를 설정하면 지도가 보여요.</span>}
          {state === 'error' && <span>지도를 불러오지 못했어요. 목록에서 장소를 확인해 주세요.</span>}
        </div>
      )}
    </div>
  );
}
