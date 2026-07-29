// app/catalog-data.js — 카탈로그 데이터 로드 + 필터/검색(순수 함수).
// index.json(= meta 레코드 배열)을 소비한다. DOM 무관 → 테스트 가능.

export async function loadCatalog() {
  const url = new URL('../algorithms/index.json', import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error('index.json 로드 실패');
  return response.json();
}

// 파셋 키 → 레코드에서 뽑을 값 배열(스칼라는 1원소 배열로 정규화)
export function fieldValues(record, key) {
  const value = record[key];
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

// 레코드들에서 특정 파셋의 고유 값 목록(정렬)
export function facetValues(records, key) {
  const unique = new Set();
  for (const record of records) for (const value of fieldValues(record, key)) unique.add(value);
  return [...unique].sort();
}

// 자유어 검색 대상: title · id · tags · categories · aliases · summary
function matchesQuery(record, query) {
  const haystack = [
    record.title, record.id, record.summary,
    ...(record.tags || []),
    ...(record.categories || []),
    ...(record.aliases || []),
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

// 필터: 파셋 종류 간 AND, 같은 파셋 내 선택값들 OR.
//   opts = { q: string, facets: { [key]: Set<string> } }
export function filterCatalog(records, { q = '', facets = {} } = {}) {
  const query = q.trim().toLowerCase();
  return records.filter(record => {
    if (query && !matchesQuery(record, query)) return false;
    for (const [key, selected] of Object.entries(facets)) {
      if (!selected || selected.size === 0) continue;      // 미선택 파셋은 건너뜀
      const recordValues = fieldValues(record, key);
      if (![...selected].some(value => recordValues.includes(value))) return false; // OR 내부
    }
    return true;
  });
}
