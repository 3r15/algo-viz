// app/paradigm-data.js — 알고리즘 "유형"(패러다임) 데이터 로드 + 알고리즘 연결.
//
// 유형은 알고리즘과 별개의 문서다(paradigms/<id>/). 알고리즘마다 유형을 손으로 적어 두면
// 금세 어긋나므로, 유형 쪽에 match 규칙만 두고 카탈로그 태그·분류로 역참조한다.
//
//   meta.match = { categories: [...], tags: [...] }
//   알고리즘이 그중 하나라도 가지면 그 유형에 속한다(OR).
//
// 덕분에 알고리즘 meta 를 건드리지 않아도 유형이 자동으로 채워지고,
// 기존 태그 검색(#/catalog?q=<tag>)과 같은 어휘를 공유하게 된다.

export async function loadParadigms() {
  const url = new URL('../paradigms/index.json', import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error('paradigms/index.json 로드 실패');
  return response.json();
}

export async function loadParadigmNotes(id) {
  try {
    const response = await fetch(new URL(`../paradigms/${id}/notes.md`, import.meta.url));
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

// 알고리즘 레코드가 이 유형에 속하는가
export function matchesParadigm(algorithm, paradigm) {
  const match = paradigm?.match || {};
  const hasCategory = (match.categories || []).some(category =>
    (algorithm.categories || []).includes(category));
  const hasTag = (match.tags || []).some(tag => (algorithm.tags || []).includes(tag));
  return hasCategory || hasTag;
}

export function algorithmsOfParadigm(algorithms, paradigm) {
  return algorithms.filter(algorithm => matchesParadigm(algorithm, paradigm));
}

// 역방향: 이 알고리즘이 속한 유형들(알고리즘 페이지의 유형 배지에 쓴다)
export function paradigmsOfAlgorithm(paradigms, algorithm) {
  return paradigms.filter(paradigm => matchesParadigm(algorithm, paradigm));
}

// 유형이 어떤 검색어로 알고리즘을 모으는지 — 태그 검색 링크로 그대로 노출한다.
// 분류와 태그에 같은 낱말이 있을 수 있으므로(예: greedy) 중복은 제거한다.
export function paradigmSearchTerms(paradigm) {
  const match = paradigm?.match || {};
  return [...new Set([...(match.categories || []), ...(match.tags || [])])];
}
