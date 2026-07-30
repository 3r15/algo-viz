// app/fetch-fresh.js — "배포하면 내용이 달라지는" 자산은 브라우저 캐시를 믿지 않는다.
//
// GitHub Pages 는 정적 자산에 `Cache-Control: max-age=600` 을 붙인다. 그림이나 CSS 라면
// 좋은 기본값이지만, 카탈로그(`algorithms/index.json`)처럼 **알고리즘을 추가하면 내용이 바뀌는
// 매니페스트**까지 그 규칙으로 캐시되면 문제가 된다 — 배포를 끝내도 이미 사이트를 본 적 있는
// 방문자에게는 최대 10분간 **예전 목록**이 그대로 보인다. 새 알고리즘이 안 보이는 것이다.
//
// `cache: 'no-cache'` 는 캐시를 버리는 게 아니라 **매번 서버에 되묻게** 한다.
// 안 바뀌었으면 304 Not Modified 로 본문 없이 끝나므로 비용은 거의 없고, 바뀌었으면 즉시 새것을 받는다.
//
// 대상은 "언제든 바뀔 수 있는 데이터"다 — 인덱스·meta·해설 문서.
// (generator.js 는 동적 import 라 캐시 모드를 지정할 수 없지만, 새 알고리즘의 generator 는
//  애초에 캐시에 있을 수 없는 새 URL 이라 이 문제를 겪지 않는다.)
export function fetchFresh(url) {
  return fetch(url, { cache: 'no-cache' });
}
