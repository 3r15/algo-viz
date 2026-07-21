// app/catalog-data.js — 카탈로그 데이터 로드 + 필터/검색(순수 함수).
// index.json(= meta 레코드 배열)을 소비한다. DOM 무관 → 테스트 가능.

export async function loadCatalog() {
  const url = new URL('../algorithms/index.json', import.meta.url);
  const r = await fetch(url);
  if (!r.ok) throw new Error('index.json 로드 실패');
  return r.json();
}

// 파셋 키 → 레코드에서 뽑을 값 배열(스칼라는 1원소 배열로 정규화)
export function fieldValues(rec, key) {
  const v = rec[key];
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

// 레코드들에서 특정 파셋의 고유 값 목록(정렬)
export function facetValues(records, key) {
  const set = new Set();
  for (const rec of records) for (const v of fieldValues(rec, key)) set.add(v);
  return [...set].sort();
}

// 자유어 검색 대상: title · id · tags · categories · aliases · summary
function matchesQuery(rec, q) {
  const hay = [
    rec.title, rec.id, rec.summary,
    ...(rec.tags || []),
    ...(rec.categories || []),
    ...(rec.aliases || []),
  ].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

// 필터: 파셋 종류 간 AND, 같은 파셋 내 선택값들 OR.
//   opts = { q: string, facets: { [key]: Set<string> } }
export function filterCatalog(records, { q = '', facets = {} } = {}) {
  const query = q.trim().toLowerCase();
  return records.filter(rec => {
    if (query && !matchesQuery(rec, query)) return false;
    for (const [key, vals] of Object.entries(facets)) {
      if (!vals || vals.size === 0) continue;         // 미선택 파셋은 건너뜀
      const recVals = fieldValues(rec, key);
      if (![...vals].some(v => recVals.includes(v))) return false; // OR 내부
    }
    return true;
  });
}
