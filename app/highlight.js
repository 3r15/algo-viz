// app/highlight.js — 경량 C++ 신택스 하이라이터(표시 전용).
// 코드 패널의 각 줄을 토큰화해 <span class="tok-*"> 로 감싼 HTML 을 돌려준다.
// 입력은 우리 소유의 generator.js code[] 이므로 신뢰 가능(그래도 텍스트는 escape).

const KEYWORDS = new Set([
  'void','int','long','short','char','bool','unsigned','signed','float','double',
  'auto','const','constexpr','static','for','while','do','if','else','switch','case',
  'default','break','continue','return','struct','class','public','private','protected',
  'using','namespace','template','typename','new','delete','sizeof','true','false',
  'nullptr','this','include','define','enum','typedef','friend','virtual','override',
]);
const TYPES = new Set([
  'vector','string','size_t','pair','map','set','unordered_map','unordered_set',
  'queue','stack','deque','priority_queue','array','list','tuple','ostream','istream',
]);

function esc(s) { return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function span(cls, text) { return `<span class="tok-${cls}">${esc(text)}</span>`; }

export function highlightCpp(line) {
  let out = '', i = 0;
  const n = line.length;
  while (i < n) {
    const c = line[i];

    if (/\s/.test(c)) { let j = i + 1; while (j < n && /\s/.test(line[j])) j++; out += esc(line.slice(i, j)); i = j; continue; }

    // 줄 주석
    if (c === '/' && line[i + 1] === '/') { out += span('com', line.slice(i)); break; }

    // 문자열 / 문자
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && !(line[j] === c && line[j - 1] !== '\\')) j++;
      j = Math.min(j + 1, n);
      out += span('str', line.slice(i, j)); i = j; continue;
    }

    // 숫자
    if (/[0-9]/.test(c)) { let j = i + 1; while (j < n && /[0-9.xXa-fA-F]/.test(line[j])) j++; out += span('num', line.slice(i, j)); i = j; continue; }

    // 전처리기 #include, #define …
    if (c === '#') { let j = i + 1; while (j < n && /[A-Za-z]/.test(line[j])) j++; out += span('kw', line.slice(i, j)); i = j; continue; }

    // 식별자 / 키워드 / 타입 / 함수
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(line[j])) j++;
      const w = line.slice(i, j);
      let k = j; while (k < n && line[k] === ' ') k++;
      let cls;
      if (KEYWORDS.has(w)) cls = 'kw';
      else if (TYPES.has(w)) cls = 'type';
      else if (line[k] === '(') cls = 'fn';
      else cls = 'id';
      out += cls === 'id' ? esc(w) : span(cls, w);
      i = j; continue;
    }

    // 구두점 / 연산자(연속 묶음, 단 // 주석 시작은 멈춤)
    { let j = i + 1; while (j < n && /[^\sA-Za-z0-9_"']/.test(line[j]) && !(line[j] === '/' && line[j + 1] === '/')) j++;
      out += span('punct', line.slice(i, j)); i = j; continue; }
  }
  return out;
}
