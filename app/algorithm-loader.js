// app/algorithm-loader.js — 폴더 규약(algorithms/<id>/)으로 알고리즘 자산을 로드.
//
// 상대 경로는 이 모듈의 URL 을 기준으로 해석하므로 GH Pages 의
// user.github.io/<repo>/ base 경로에서도 그대로 동작한다.
//
// generator.js 계약: export generate(input), code[], defaultInput, category.
// meta.json 은 있으면 쓰고 없으면 무시(단독 generator 도 허용).
// reference-trace.json 은 CI 검증(validate-trace)용 오라클이라 런타임에선 로드하지 않는다.

export async function loadAlgorithm(id) {
  const genURL  = new URL(`../algorithms/${id}/generator.js`, import.meta.url);
  const metaURL = new URL(`../algorithms/${id}/meta.json`, import.meta.url);

  const mod = await import(genURL.href);
  if (typeof mod.generate !== 'function')
    throw new Error(`${id}/generator.js 는 generate(input) 를 export 해야 합니다`);

  const meta = await fetchJSON(metaURL);

  return {
    id,
    generate: mod.generate,
    code: Array.isArray(mod.code) ? mod.code : [],
    defaultInput: mod.defaultInput ?? [5, 2, 9, 1, 5, 6],
    category: mod.category ?? meta?.categories?.[0] ?? '',
    dataStructure: meta?.dataStructures?.[0] ?? 'array',
    title: meta?.title ?? id,
    complexity: meta?.complexity ?? null,
    difficulty: meta?.difficulty ?? null,
    tags: meta?.tags ?? [],
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
