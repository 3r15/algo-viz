// algorithms/trie/generator.js — Model A 생성기(트라이 / 접두사 트리).
//
// 문자열 집합을 **글자 단위 트리**로 저장한다. 뿌리에서 내려가는 한 경로 = 한 문자열의 접두사.
//   insert(s): 뿌리에서 시작해 글자마다 자식으로 내려가고, 없으면 새 노드를 만든다. 끝에 "단어 끝" 표시.
//   search(s): 같은 길을 따라가다 길이 끊기면 없음. 끝까지 가면 "단어 끝" 인지 확인(접두사와 구별).
//   공통 접두사를 공유해 저장·검색이 문자열 길이에만 비례한다(사전, 자동완성의 뼈대).
//
// 입력은 공백으로 구분한 소문자 단어들(inputKind='text'). 시각화: tree 슬롯(rooted, 글자 노드).

export const category = 'string';
export const inputKind = 'text';
export const defaultInput = 'cat car card do dog';
export const inputLabel = '단어들';
export const inputHint = '공백으로 구분한 소문자 단어들. 공통 접두사를 공유하는 트라이로 쌓는다.';

const MAX_WORDS = 6, MAX_LEN = 8, MAX_NODES = 40;

export function randomInput() {
  const samples = ['cat car card do dog', 'to tea ten ted', 'bee be bat bad', 'go god gold go', 'ab abc abcd'];
  return samples[Math.floor(Math.random() * samples.length)];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'struct Node { int next[26]; bool end; };     // 26개 자식 + 단어 끝',
  'vector<Node> t(1);                            // t[0] = 루트',
  'void insert(string s) {',
  '    int cur = 0;',
  '    for (char ch : s) {',
  '        int c = ch - \'a\';',
  '        if (t[cur].next[c] == 0) {            // 자식이 없으면 새로',
  '            t[cur].next[c] = t.size();',
  '            t.push_back({});',
  '        }',
  '        cur = t[cur].next[c];                 // 한 글자 내려간다',
  '    }',
  '    t[cur].end = true;                        // 여기서 단어가 끝난다',
  '}',
  'bool search(string s) {',
  '    int cur = 0;',
  '    for (char ch : s) {',
  '        int c = ch - \'a\';',
  '        if (t[cur].next[c] == 0) return false; // 길이 끊기면 없음',
  '        cur = t[cur].next[c];',
  '    }',
  '    return t[cur].end;                        // 접두사 말고 단어인가',
  '}',
];

function parseWords(input) {
  const text = typeof input === 'string' ? input : (Array.isArray(input) ? input.join(' ') : '');
  return text.toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^a-z]/g, '').slice(0, MAX_LEN))
    .filter(Boolean)
    .slice(0, MAX_WORDS);
}

export function generate(input) {
  const words = parseWords(input);
  if (!words.length) {
    return [{ line: 2, op: 'done', a: -1, b: -1, sortedFrom: 1, values: [0],
      explain: '단어를 공백으로 구분해 입력하세요 (예: cat car card)',
      tree: { kind: 'rooted', parent: [-1], root: 0, values: ['·'], states: [0], marks: {} } }];
  }

  // 트라이 노드: parent[], charOf[](표시 글자), isEnd[]. 자식은 (node,char)→child 맵.
  const parent = [-1];
  const charOf = ['·'];              // 뿌리
  const isEnd = [false];
  const child = new Map();           // key `${node}:${ch}` → childId
  const nodeState = [0];

  const marks = () => {
    const m = {};
    for (let i = 0; i < isEnd.length; i++) if (isEnd[i]) m[i] = '●';
    return m;
  };
  const treeSnap = () => ({
    kind: 'rooted', parent: parent.slice(), root: 0,
    values: charOf.slice(), states: nodeState.slice(), marks: marks(),
  });

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: nodeState.slice(),
    sortedFrom: parent.length,
    explain,
    tree: treeSnap(),
  });
  const clearActive = () => { for (let i = 0; i < nodeState.length; i++) if (nodeState[i] === 2) nodeState[i] = 0; };

  pushStep(2, 'start',
    `${words.length}개 단어를 트라이에 넣는다: ${words.join(', ')}. ` +
    `뿌리에서 글자마다 내려가며, 공통 접두사는 한 경로를 공유한다`);

  // ── insert 반복 ──
  for (const word of words) {
    clearActive();
    let cur = 0;
    nodeState[cur] = 2;
    pushStep(4, 'set', `insert("${word}") — 뿌리에서 시작`, { a: cur });
    for (const ch of word) {
      if (parent.length >= MAX_NODES) break;
      const key = cur + ':' + ch;
      if (!child.has(key)) {
        const id = parent.length;
        parent.push(cur); charOf.push(ch); isEnd.push(false); nodeState.push(0);
        child.set(key, id);
        clearActive();
        nodeState[cur] = 1; nodeState[id] = 2;
        pushStep(8, 'write', `'${ch}' 자식이 없다 → 새 노드 ${id} 를 만들어 잇는다`, { a: cur, b: id });
        cur = id;
      } else {
        const id = child.get(key);
        clearActive();
        nodeState[cur] = 1; nodeState[id] = 2;
        pushStep(11, 'read', `'${ch}' 자식이 이미 있다(노드 ${id}) → 내려간다(접두사 공유)`, { a: cur, b: id });
        cur = id;
      }
    }
    isEnd[cur] = true;
    pushStep(13, 'mark', `"${word}" 끝 → 노드 ${cur} 에 단어 끝(●) 표시`, { a: cur });
  }

  // ── search 데모: 있는 단어 / 접두사만 / 없는 단어 ──
  const present = words[0];
  const runSearch = (query, kind) => {
    clearActive();
    let cur = 0; nodeState[cur] = 2;
    pushStep(16, 'set', `search("${query}") — 뿌리에서 시작`, { a: cur });
    let broke = false;
    for (const ch of query) {
      const key = cur + ':' + ch;
      if (!child.has(key)) {
        pushStep(19, 'compare', `'${ch}' 자식이 없다 → "${query}" 는 트라이에 없다`, { a: cur });
        broke = true; break;
      }
      const id = child.get(key);
      clearActive(); nodeState[cur] = 1; nodeState[id] = 2;
      pushStep(20, 'read', `'${ch}' 따라 노드 ${id} 로`, { a: cur, b: id });
      cur = id;
    }
    if (broke) return;
    if (isEnd[cur]) {
      nodeState[cur] = 3;
      pushStep(22, 'done', `끝까지 왔고 노드 ${cur} 가 단어 끝(●) → "${query}" 는 등록된 단어다`, { a: cur });
    } else {
      pushStep(22, 'done', `끝까지 왔지만 노드 ${cur} 는 단어 끝이 아니다 → "${query}" 는 접두사일 뿐 단어는 아니다`, { a: cur });
    }
  };

  runSearch(present, 'present');
  // 접두사만: 첫 단어의 앞 2글자(단어가 아니면 접두사 데모)
  const prefixOnly = present.slice(0, Math.max(1, present.length - 1));
  if (prefixOnly !== present && !words.includes(prefixOnly)) runSearch(prefixOnly, 'prefix');

  return steps;
}
