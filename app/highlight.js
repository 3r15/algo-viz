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

const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const escapeHtml = text => text.replace(/[&<>]/g, ch => HTML_ENTITIES[ch]);
const token = (className, text) => `<span class="tok-${className}">${escapeHtml(text)}</span>`;

export function highlightCpp(line) {
  let html = '';
  let pos = 0;                       // 지금 읽고 있는 위치
  const length = line.length;

  // 각 분기는 [pos, end) 를 한 토큰으로 소비하고 pos 를 end 로 옮긴다
  while (pos < length) {
    const ch = line[pos];

    // 공백
    if (/\s/.test(ch)) {
      let end = pos + 1;
      while (end < length && /\s/.test(line[end])) end++;
      html += escapeHtml(line.slice(pos, end));
      pos = end;
      continue;
    }

    // 줄 주석 — 줄 끝까지
    if (ch === '/' && line[pos + 1] === '/') { html += token('com', line.slice(pos)); break; }

    // 문자열 / 문자 리터럴
    if (ch === '"' || ch === "'") {
      let end = pos + 1;
      while (end < length && !(line[end] === ch && line[end - 1] !== '\\')) end++;
      end = Math.min(end + 1, length);          // 닫는 따옴표까지 포함
      html += token('str', line.slice(pos, end));
      pos = end;
      continue;
    }

    // 숫자(16진수·소수점 포함)
    if (/[0-9]/.test(ch)) {
      let end = pos + 1;
      while (end < length && /[0-9.xXa-fA-F]/.test(line[end])) end++;
      html += token('num', line.slice(pos, end));
      pos = end;
      continue;
    }

    // 전처리기 #include, #define …
    if (ch === '#') {
      let end = pos + 1;
      while (end < length && /[A-Za-z]/.test(line[end])) end++;
      html += token('kw', line.slice(pos, end));
      pos = end;
      continue;
    }

    // 식별자 / 키워드 / 타입 / 함수
    if (/[A-Za-z_]/.test(ch)) {
      let end = pos + 1;
      while (end < length && /[A-Za-z0-9_]/.test(line[end])) end++;
      const word = line.slice(pos, end);

      // 이름 뒤에 '(' 가 오면 함수 호출로 본다(사이의 공백은 건너뛴다)
      let lookahead = end;
      while (lookahead < length && line[lookahead] === ' ') lookahead++;

      let className;
      if (KEYWORDS.has(word)) className = 'kw';
      else if (TYPES.has(word)) className = 'type';
      else if (line[lookahead] === '(') className = 'fn';
      else className = 'id';

      html += className === 'id' ? escapeHtml(word) : token(className, word);
      pos = end;
      continue;
    }

    // 구두점 / 연산자(연속 묶음, 단 // 주석 시작에서 멈춤)
    let end = pos + 1;
    while (end < length && /[^\sA-Za-z0-9_"']/.test(line[end])
           && !(line[end] === '/' && line[end + 1] === '/')) end++;
    html += token('punct', line.slice(pos, end));
    pos = end;
  }

  return html;
}
