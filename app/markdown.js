// app/markdown.js — 의존성 없는 초소형 마크다운 → HTML 변환기.
//
// notes.md(알고리즘 해설 문서)를 브라우저에서 렌더하기 위한 용도. 빌드리스 원칙을 지키려고
// marked/markdown-it 같은 라이브러리를 쓰지 않는다. 지원 범위는 notes.md 작성 규약
// (.claude/skills/algorithm-notes)에 필요한 것만:
//
//   # ~ #### 헤딩 · 문단 · 순서/비순서 목록(중첩 1단계) · 표 · 코드펜스 · 인용 · 수평선
//   인라인: `code` · **강조** · *기울임* · [링크](url)
//
// 보안: 모든 텍스트를 먼저 이스케이프한 뒤 인라인 패턴을 적용하므로 원문의 HTML 은
// 절대 실행되지 않는다(문서는 저장소 안의 신뢰된 파일이지만, 규칙을 단순하게 유지한다).

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 링크는 http(s)/해시/상대 경로만 허용(javascript: 등 차단)
function safeHref(url) {
  const u = url.trim();
  return /^(https?:\/\/|#|\.{0,2}\/)/.test(u) ? u : '#';
}

// 인라인 변환. 입력은 "이스케이프 전" 원문 한 줄.
function inline(src) {
  const codes = [];
  // 1) `code` 를 먼저 뽑아 자리표시자(NUL 로 감싼 인덱스)로 치환 — 안쪽은 더 이상 변환하지 않는다.
  //    NUL 은 문서 본문에 나타날 수 없으므로 "n = 5 이다" 같은 평문과 충돌하지 않는다.
  let s = String(src).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${esc(c)}</code>`);
    return `\x00${codes.length - 1}\x00`;
  });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${esc(safeHref(u))}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s.replace(/\x00(\d+)\x00/g, (_, i) => codes[Number(i)]);
}

// 헤딩에서 인라인 마크다운 기호를 걷어낸 순수 텍스트 — 목차 라벨용.
function plain(text) {
  return String(text)
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();
}

// 헤딩 텍스트 → URL 앵커용 slug. 한글을 살리되 공백/기호는 하이픈으로.
export function slugify(text) {
  return String(text).trim().toLowerCase()
    .replace(/[`*_[\]()]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function tableRow(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
}

/**
 * 마크다운 → HTML.
 * @returns {{ html: string, toc: {level:number, text:string, id:string}[] }}
 *   toc 는 h2/h3 만 담는다(문서 목차용).
 */
export function renderMarkdown(md) {
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const toc = [];
  const seen = new Set();
  let i = 0;

  const uniqueId = text => {
    let id = slugify(text), k = 2;
    while (seen.has(id)) id = `${slugify(text)}-${k++}`;
    seen.add(id);
    return id;
  };

  while (i < lines.length) {
    const line = lines[i];

    // 빈 줄
    if (!line.trim()) { i++; continue; }

    // 코드 펜스 ```lang
    if (/^\s*```/.test(line)) {
      const lang = line.trim().slice(3).trim();
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++; // 닫는 펜스
      out.push(`<pre class="md-code"${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }

    // 수평선
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr />'); i++; continue; }

    // 헤딩
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const id = uniqueId(text);
      if (level === 2 || level === 3) toc.push({ level, text: plain(text), id });
      out.push(`<h${level} id="${esc(id)}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // 표: 헤더 줄 + 구분 줄(|---|---|)
    if (line.trim().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const head = tableRow(line);
      const align = tableRow(lines[i + 1]).map(c =>
        c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left');
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) body.push(tableRow(lines[i++]));
      const th = head.map((c, k) => `<th style="text-align:${align[k] || 'left'}">${inline(c)}</th>`).join('');
      const tr = body.map(r =>
        `<tr>${r.map((c, k) => `<td style="text-align:${align[k] || 'left'}">${inline(c)}</td>`).join('')}</tr>`).join('');
      out.push(`<div class="md-tablewrap"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`);
      continue;
    }

    // 인용
    if (/^\s*>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${body.filter(Boolean).map(b => `<p>${inline(b)}</p>`).join('')}</blockquote>`);
      continue;
    }

    // 목록(중첩 1단계까지: 들여쓰기 2칸 이상이면 하위 목록)
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        const nested = m[1].length >= 2;
        const text = inline(m[3]);
        if (nested && items.length) items[items.length - 1].children.push(text);
        else items.push({ text, children: [] });
        i++;
        // 항목에 이어지는 들여쓰기 연속 줄은 같은 항목에 이어붙인다
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          const tgt = items[items.length - 1];
          tgt.text += ' ' + inline(lines[i].trim());
          i++;
        }
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map(it =>
        `<li>${it.text}${it.children.length ? `<ul>${it.children.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}</li>`
      ).join('') + `</${tag}>`);
      continue;
    }

    // 문단(빈 줄까지 이어짐)
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(#{1,4}\s|```|>|\||[-*+]\s|\d+\.\s|-{3,}\s*$)/.test(lines[i]))
      para.push(lines[i++]);
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    else i++; // 방어: 어떤 규칙에도 안 걸리면 한 줄 버리고 진행(무한 루프 방지)
  }

  return { html: out.join('\n'), toc };
}
