// 카카오톡 공유 (Kakao JavaScript SDK)
// .env.local 의 VITE_KAKAO_JS_KEY 가 있을 때만 동작합니다.
const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
const jsKey = import.meta.env.VITE_KAKAO_JS_KEY;

export const isKakaoConfigured = Boolean(jsKey);

let loading = null;

// SDK 를 처음 쓸 때 한 번만 불러와서 초기화
export function loadKakao() {
  if (!jsKey) return Promise.reject(new Error('카카오 JavaScript 키가 설정되지 않았어요.'));
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const init = () => {
        const { Kakao } = window;
        if (!Kakao) return reject(new Error('카카오 SDK 를 불러오지 못했어요.'));
        if (!Kakao.isInitialized()) Kakao.init(jsKey);
        resolve(Kakao);
      };
      if (window.Kakao) return init();
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = init;
      script.onerror = () => {
        loading = null; // 다음에 다시 시도할 수 있게
        reject(new Error('카카오 SDK 를 불러오지 못했어요.'));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

// 링크 카드(피드형) 공유
export async function shareToKakao({ title, description, url, imageUrl }) {
  const Kakao = await loadKakao();
  const link = { mobileWebUrl: url, webUrl: url };
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title,
      description,
      imageUrl: imageUrl || `${window.location.origin}/logo.png`,
      link,
    },
    buttons: [{ title: '자세히 보기', link }],
  });
}
