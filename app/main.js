// app/main.js — 앱 셸 라우터. 해시를 읽어 뷰를 #app 에 디스패치한다.
//
//   #/              또는 #/catalog   →  카탈로그(메인): 검색 + 파셋 + 카드
//   #/algo/:id                       →  단일 채널 Model A 플레이어
//   #/paradigms                      →  알고리즘 유형(패러다임) 목록
//   #/paradigm/:id                   →  유형 문서 + 그 유형의 알고리즘(자동 수집)
//
// GH Pages 는 서버 리라이트가 없어 해시 라우팅이 필수다. 각 뷰는 teardown
// 함수를 반환하고, 라우터가 다음 뷰로 넘어가기 전에 호출해 타이머·리스너를 정리한다.

import { renderCatalog } from './views/catalog.js';
import { renderAlgorithm } from './views/algorithm.js';
import { renderParadigm, renderParadigmList } from './views/paradigm.js';

const app = document.getElementById('app');
let teardown = null;
let token = 0; // 라우팅 경합 방지(빠른 연속 이동 시 늦은 응답 무시)

async function route() {
  const mine = ++token;
  if (teardown) { teardown(); teardown = null; }
  app.innerHTML = '';

  // 해시에서 경로와 쿼리 분리: "#/catalog?q=in-place" → path, query
  const raw = location.hash || '';
  const queryStart = raw.indexOf('?');
  const path = queryStart >= 0 ? raw.slice(0, queryStart) : raw;
  const query = queryStart >= 0 ? raw.slice(queryStart + 1) : '';

  const algoRoute = path.match(/^#\/algo\/([\w-]+)/);
  const paradigmRoute = path.match(/^#\/paradigm\/([\w-]+)/);

  let next;
  if (algoRoute) next = await renderAlgorithm(app, algoRoute[1]);
  else if (paradigmRoute) next = await renderParadigm(app, paradigmRoute[1]);
  else if (/^#\/paradigms\/?$/.test(path)) next = await renderParadigmList(app);
  else next = await renderCatalog(app, { q: new URLSearchParams(query).get('q') || '' });

  if (mine !== token) { next && next(); return; } // 그새 다른 라우팅 발생 → 폐기
  teardown = next;
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
