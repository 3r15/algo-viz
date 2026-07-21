// app/algorithm-loader.js — 폴더 규약(algorithms/<id>/)으로 알고리즘 자산을 로드.
//
// 상대 경로는 이 모듈의 URL 을 기준으로 해석하므로 GH Pages 의
// user.github.io/<repo>/ base 경로에서도 그대로 동작한다.
//
// generator.js 계약: export generate(input), code[], defaultInput, category.
// meta.json / reference-trace.json 은 있으면 쓰고 없으면 무시(단독 generator 도 허용).

export async function loadAlgorithm(id) {
  const genURL  = new URL(`../algorithms/${id}/generator.js`, import.meta.url);
  const metaURL = new URL(`../algorithms/${id}/meta.json`, import.meta.url);
  const refURL  = new URL(`../algorithms/${id}/reference-trace.json`, import.meta.url);

  const mod = await import(genURL.href);
  if (typeof mod.generate !== 'function')
    throw new Error(`${id}/generator.js 는 generate(input) 를 export 해야 합니다`);

  const [meta, referenceTrace] = await Promise.all([
    fetchJSON(metaURL),
    fetchJSON(refURL),
  ]);

  return {
    id,
    generate: mod.generate,
    code: Array.isArray(mod.code) ? mod.code : [],
    defaultInput: mod.defaultInput ?? [5, 2, 9, 1, 5, 6],
    category: mod.category ?? meta?.categories?.[0] ?? '',
    dataStructure: meta?.dataStructures?.[0] ?? 'array',
    title: meta?.title ?? id,
    referenceTrace,          // Model 2 사전 계산(기본 입력용) — 없으면 null
    wasm: meta?.wasm ?? null, // { export, run } — 있으면 라이브 WASM 시도
  };
}

async function fetchJSON(url) {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
