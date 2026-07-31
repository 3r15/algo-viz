// algorithms/aho-corasick/generator.js — Model A 생성기(아호-코라식, 다중 패턴 검색).
//
// 여러 패턴을 텍스트 한 번 훑기로 모두 찾는다. [트라이](trie)에 패턴을 넣고,
// [KMP](kmp)의 실패 함수를 트라이로 일반화한 **실패 링크(fail link)** 를 건다.
//   fail[u] = "루트에서 u 까지의 문자열의 가장 긴 진접미사" 에 대응하는 트라이 노드.
//   텍스트를 훑다 글자가 막히면 fail 을 따라 미끄러진다(텍스트는 안 되돌린다) → O(n + Σm + 매칭수).
//
// 입력은 문자열들(inputKind='text'): 첫 단어=텍스트, 나머지=패턴들.
// 시각화: tree 슬롯(트라이 + fail 링크 배지) + matrix 슬롯(텍스트 스캔).

export const category = 'string';
export const inputKind = 'text';
export const defaultInput = 'ahishers his he she';
export const inputLabel = '텍스트 패턴들';
export const inputHint = '첫 단어는 텍스트, 나머지는 찾을 패턴들. 예: ahishers his he she.';

const MAX_TEXT = 14, MAX_PAT = 6, MAX_NODES = 40;

export function randomInput() {
  const samples = ['ahishers his he she', 'abababab ab aba', 'ushers she he hers', 'aaaa aa a', 'bananas ana ban nan'];
  return samples[Math.floor(Math.random() * samples.length)];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// 트라이 + 실패 링크로 다중 패턴을 한 번에',
  'void build() {                         // 실패 링크 계산(BFS)',
  '    queue<int> q;',
  '    for (int c = 0; c < 26; c++)',
  '        if (go[0][c]) fail[go[0][c]] = 0, q.push(go[0][c]);',
  '    while (!q.empty()) {',
  '        int u = q.front(); q.pop();',
  '        for (int c = 0; c < 26; c++) if (int v = go[u][c]) {',
  '            int f = fail[u];',
  '            while (f && !go[f][c]) f = fail[f];',
  '            fail[v] = go[f][c];        // 부모 fail 을 따라',
  '            out[v] |= out[fail[v]];    // 접미사로 끝나는 패턴 상속',
  '            q.push(v);',
  '        }',
  '    }',
  '}',
  'void search(string t) {',
  '    int u = 0;',
  '    for (char ch : t) {',
  '        int c = ch - \'a\';',
  '        while (u && !go[u][c]) u = fail[u];  // 막히면 fail 로',
  '        u = go[u][c];                  // 전이(없으면 0)',
  '        report(out[u]);                // u 에서 끝나는 모든 패턴',
  '    }',
  '}',
];

function parseWords(input) {
  const text = typeof input === 'string' ? input : (Array.isArray(input) ? input.join(' ') : '');
  const words = text.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z]/g, '')).filter(Boolean);
  const t = (words[0] || '').slice(0, MAX_TEXT);
  const pats = [...new Set(words.slice(1))].filter(Boolean).slice(0, MAX_PAT).map(p => p.slice(0, MAX_TEXT));
  return [t, pats];
}

export function generate(input) {
  const [text, patterns] = parseWords(input);
  if (!text || !patterns.length) {
    return [{ line: 15, op: 'done', a: -1, b: -1, sortedFrom: 1, values: [0],
      explain: '텍스트와 패턴을 공백으로 구분해 입력하세요 (예: ahishers his he she)',
      tree: { kind: 'rooted', parent: [-1], root: 0, values: ['·'], states: [0], marks: {} } }];
  }

  // ── 트라이 구성 ──
  const parent = [-1], charOf = ['·'], child = new Map();
  const fail = [0], output = [[]];      // output[node] = 여기서 끝나는 패턴 인덱스들
  const nodeState = [0];
  const addNode = (par, ch) => {
    const id = parent.length;
    parent.push(par); charOf.push(ch); fail.push(0); output.push([]); nodeState.push(0);
    return id;
  };
  patterns.forEach((pat, pi) => {
    let cur = 0;
    for (const ch of pat) {
      if (parent.length >= MAX_NODES) break;
      const key = cur + ':' + ch;
      if (!child.has(key)) child.set(key, addNode(cur, ch));
      cur = child.get(key);
    }
    output[cur].push(pi);
  });
  const N = parent.length;
  const childOf = (u, ch) => child.get(u + ':' + ch);

  // ── 실패 링크(BFS) ──
  const queue = [];
  for (const [key, v] of child) if (Number(key.split(':')[0]) === 0) { fail[v] = 0; queue.push(v); }
  while (queue.length) {
    const u = queue.shift();
    for (const ch of new Set([...child.keys()].filter(k => Number(k.split(':')[0]) === u).map(k => k.split(':')[1]))) {
      const v = childOf(u, ch);
      // fail[v] = go[fail[u]][ch] (fail 사슬을 따라가며 ch 자식 찾기)
      let f = fail[u];
      while (f !== 0 && childOf(f, ch) === undefined) f = fail[f];
      const fc = childOf(f, ch);
      fail[v] = (fc !== undefined && fc !== v) ? fc : 0;
      output[v] = [...output[v], ...output[fail[v]]];
      queue.push(v);
    }
  }

  const marks = () => {
    const m = {};
    for (let i = 1; i < N; i++) if (fail[i] !== 0 || output[i].length) {
      const parts = [];
      if (output[i].length) parts.push('●');
      m[i] = parts.join('');
    }
    return m;
  };
  const titles = () => Array.from({ length: N }, (_, i) => i === 0 ? '루트' : `노드 ${i} · fail→${fail[i]}${output[i].length ? ' · 끝:' + output[i].map(p => patterns[p]).join(',') : ''}`);

  const matches = [];   // {pat, start, end}
  const buildText = (pos, matchRange) => {
    const states = new Array(text.length).fill(0);
    for (const mr of matches) for (let t = mr.start; t <= mr.end; t++) states[t] = 1;
    if (matchRange) for (let t = matchRange[0]; t <= matchRange[1]; t++) states[t] = 3;
    if (pos >= 0 && pos < text.length) states[pos] = 2;
    return {
      rows: 1, cols: text.length,
      values: text.split(''), states,
      rowLabels: ['텍스트'],
      colLabels: Array.from({ length: text.length }, (_, t) => String(t)),
      caption: matches.length ? `찾음: ${matches.map(m => `${patterns[m.pat]}@${m.start}`).join(', ')}` : '아직 매칭 없음',
    };
  };

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op, a: extra.a ?? -1, b: extra.b ?? -1,
    values: nodeState.slice(), sortedFrom: N,
    tree: { kind: 'rooted', parent: parent.slice(), root: 0, values: charOf.slice(), states: nodeState.slice(), marks: marks(), titles: titles() },
    matrix: buildText(extra.pos ?? -1, extra.matchRange),
    explain,
  });

  pushStep(18, 'start',
    `패턴 ${patterns.length}개(${patterns.join(', ')})를 트라이에 넣고 실패 링크를 걸었다. ` +
    `이제 텍스트 "${text}" 를 한 번 훑으며 모든 패턴을 찾는다`);

  // ── 텍스트 스캔 ──
  let u = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // go[u][ch]: fail 사슬을 따라가며 전이(실제 자동자는 미리 접어 두지만 여기선 fail 로 표현)
    while (u !== 0 && childOf(u, ch) === undefined) u = fail[u];
    const nxt = childOf(u, ch);
    u = (nxt !== undefined) ? nxt : 0;

    for (let k = 0; k < N; k++) if (nodeState[k] === 2) nodeState[k] = 0;
    nodeState[u] = 2;
    pushStep(22, 'read', `text[${i}]='${ch}' → 트라이 노드 ${u} 로 이동(막히면 fail 링크로 미끄러짐)`, { a: u, pos: i });

    if (output[u].length) {
      for (const pi of output[u]) {
        const start = i - patterns[pi].length + 1, end = i;
        matches.push({ pat: pi, start, end });
        nodeState[u] = 3;
        pushStep(23, 'write', `노드 ${u} 에서 패턴 "${patterns[pi]}" 이 ${start}번 위치에서 끝난다 → 찾음!`, { a: u, pos: i, matchRange: [start, end] });
      }
    }
  }

  for (let k = 0; k < N; k++) if (nodeState[k] === 2) nodeState[k] = 0;
  const found = matches.map(m => `"${patterns[m.pat]}"@${m.start}`).join(', ');
  pushStep(25, 'done',
    `완성 — 텍스트를 한 번 훑어 ${matches.length}개 매칭: ${found || '없음'}. ` +
    `텍스트 포인터를 되돌리지 않아 O(n + Σ패턴길이 + 매칭수)`, { pos: -1 });

  return steps;
}
