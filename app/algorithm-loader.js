// app/algorithm-loader.js — 폴더 규약(algorithms/<id>/)으로 알고리즘 자산을 로드.
//
// 상대 경로는 이 모듈의 URL 을 기준으로 해석하므로 GH Pages 의
// user.github.io/<repo>/ base 경로에서도 그대로 동작한다.
//
// 해설은 두 층이다: walkthrough.md(차근차근) + notes.md(깊이 보기). 둘 다 선택.
// generator.js 계약: export generate(input), code[], defaultInput, category.
// meta.json 은 있으면 쓰고 없으면 무시(단독 generator 도 허용).
// meta 에 "placeholder": true 면 generator.js 를 로드하지 않고 "준비 중" 자산만 돌려준다.
// reference-trace.json 은 CI 검증(validate-trace)용 오라클이라 런타임에선 로드하지 않는다.

export async function loadAlgorithm(id) {
  const metaURL = new URL(`../algorithms/${id}/meta.json`, import.meta.url);
  const notesURL = new URL(`../algorithms/${id}/notes.md`, import.meta.url);
  const walkthroughURL = new URL(`../algorithms/${id}/walkthrough.md`, import.meta.url);
  const [meta, notes, walkthrough] = await Promise.all([
    fetchJSON(metaURL), fetchText(notesURL), fetchText(walkthroughURL),
  ]);

  const base = {
    id,
    title: meta?.title ?? id,
    summary: meta?.summary ?? '',
    category: meta?.categories?.[0] ?? '',
    categories: meta?.categories ?? [],
    dataStructure: meta?.dataStructures?.[0] ?? 'array',
    dataStructures: meta?.dataStructures?.length ? meta.dataStructures : ['array'],
    complexity: meta?.complexity ?? null,
    difficulty: meta?.difficulty ?? null,
    tags: meta?.tags ?? [],
    walkthrough,                            // walkthrough.md — 초보자 트랙(없으면 null)
    notes,                                  // notes.md — 심화 트랙(없으면 null)
  };

  if (meta?.placeholder) return { ...base, placeholder: true };

  const genURL = new URL(`../algorithms/${id}/generator.js`, import.meta.url);
  const mod = await import(genURL.href);
  if (typeof mod.generate !== 'function')
    throw new Error(`${id}/generator.js 는 generate(input) 를 export 해야 합니다`);

  return {
    ...base,
    placeholder: false,
    generate: mod.generate,
    code: Array.isArray(mod.code) ? mod.code : [],
    defaultInput: mod.defaultInput ?? [5, 2, 9, 1, 5, 6],
    inputLabel: mod.inputLabel ?? 'input[]',   // 입력이 배열이 아닌 의미일 때(예: parent[])
    inputHint: mod.inputHint ?? '',            // 입력란 아래 한 줄 안내(선택)
    inputKind: mod.inputKind === 'text' ? 'text' : 'numbers',  // 문자열 입력(LCS 등)이면 'text'
    randomInput: typeof mod.randomInput === 'function' ? mod.randomInput : null, // Randomize 버튼용(선택)
    category: mod.category ?? base.category,
    defaultGraph: mod.defaultGraph ?? mod.graph ?? null,  // 그래프 알고리즘의 초기 구조(편집기 시작값)
    capabilities: mod.capabilities ?? { directed: false, weighted: false }, // 지원 옵션(편집기 게이팅)
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

async function fetchText(url) {
  try {
    const r = await fetch(url);
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}
