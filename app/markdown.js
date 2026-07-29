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

const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = text => String(text).replace(/[&<>"]/g, ch => HTML_ENTITIES[ch]);

// 링크는 http(s)/해시/상대 경로만 허용(javascript: 등 차단)
function safeHref(url) {
  const trimmed = url.trim();
  return /^(https?:\/\/|#|\.{0,2}\/)/.test(trimmed) ? trimmed : '#';
}

// 인라인 변환. 입력은 "이스케이프 전" 원문 한 줄.
function renderInline(source) {
  const codeSpans = [];
  // 1) `code` 를 먼저 뽑아 자리표시자(NUL 로 감싼 인덱스)로 치환 — 안쪽은 더 이상 변환하지 않는다.
  //    NUL 은 문서 본문에 나타날 수 없으므로 "n = 5 이다" 같은 평문과 충돌하지 않는다.
  let html = String(source).replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `\x00${codeSpans.length - 1}\x00`;
  });
  html = escapeHtml(html);
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label, href) => `<a href="${escapeHtml(safeHref(href))}">${label}</a>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return html.replace(/\x00(\d+)\x00/g, (_, slot) => codeSpans[Number(slot)]);
}

// 헤딩에서 인라인 마크다운 기호를 걷어낸 순수 텍스트 — 목차 라벨용.
function stripInlineMarks(text) {
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

// "| a | b |" → ['a', 'b']
function splitTableRow(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
}

/**
 * 마크다운 → HTML.
 * @returns {{ html: string, toc: {level:number, text:string, id:string}[] }}
 *   toc 는 h2/h3 만 담는다(문서 목차용).
 */
export function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];              // 완성된 블록 HTML 조각들
  const toc = [];
  const usedIds = new Set();
  let cursor = 0;                 // 지금 읽고 있는 줄 번호(0-based)

  // 같은 제목이 두 번 나와도 앵커가 겹치지 않게 -2, -3 을 붙인다
  const uniqueId = text => {
    let id = slugify(text);
    let suffix = 2;
    while (usedIds.has(id)) id = `${slugify(text)}-${suffix++}`;
    usedIds.add(id);
    return id;
  };

  while (cursor < lines.length) {
    const line = lines[cursor];

    // 빈 줄
    if (!line.trim()) { cursor++; continue; }

    // 코드 펜스 ```lang
    if (/^\s*```/.test(line)) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      cursor++;
      while (cursor < lines.length && !/^\s*```/.test(lines[cursor])) codeLines.push(lines[cursor++]);
      cursor++; // 닫는 펜스
      blocks.push(`<pre class="md-code"${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}>` +
        `<code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // 수평선
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push('<hr />'); cursor++; continue; }

    // 헤딩
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = uniqueId(text);
      if (level === 2 || level === 3) toc.push({ level, text: stripInlineMarks(text), id });
      blocks.push(`<h${level} id="${escapeHtml(id)}">${renderInline(text)}</h${level}>`);
      cursor++;
      continue;
    }

    // 표: 헤더 줄 + 구분 줄(|---|---|)
    if (line.trim().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[cursor + 1] || '')) {
      const headerCells = splitTableRow(line);
      const alignments = splitTableRow(lines[cursor + 1]).map(spec =>
        spec.startsWith(':') && spec.endsWith(':') ? 'center' : spec.endsWith(':') ? 'right' : 'left');
      cursor += 2;
      const bodyRows = [];
      while (cursor < lines.length && lines[cursor].trim().startsWith('|'))
        bodyRows.push(splitTableRow(lines[cursor++]));

      const headHtml = headerCells.map((cell, col) =>
        `<th style="text-align:${alignments[col] || 'left'}">${renderInline(cell)}</th>`).join('');
      const bodyHtml = bodyRows.map(cells =>
        `<tr>${cells.map((cell, col) =>
          `<td style="text-align:${alignments[col] || 'left'}">${renderInline(cell)}</td>`).join('')}</tr>`).join('');
      blocks.push('<div class="md-tablewrap"><table>' +
        `<thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
      continue;
    }

    // 인용
    if (/^\s*>\s?/.test(line)) {
      const quotedLines = [];
      while (cursor < lines.length && /^\s*>\s?/.test(lines[cursor]))
        quotedLines.push(lines[cursor++].replace(/^\s*>\s?/, ''));
      blocks.push('<blockquote>' +
        quotedLines.filter(Boolean).map(quoted => `<p>${renderInline(quoted)}</p>`).join('') +
        '</blockquote>');
      continue;
    }

    // 목록(중첩 1단계까지: 들여쓰기 2칸 이상이면 하위 목록)
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (cursor < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[cursor])) {
        const [, indent, , itemText] = lines[cursor].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        const isNested = indent.length >= 2;
        if (isNested && items.length) items[items.length - 1].children.push(renderInline(itemText));
        else items.push({ text: renderInline(itemText), children: [] });
        cursor++;
        // 항목에 이어지는 들여쓰기 연속 줄은 같은 항목에 이어붙인다
        while (cursor < lines.length && /^\s{2,}\S/.test(lines[cursor])
               && !/^\s*([-*+]|\d+\.)\s+/.test(lines[cursor])) {
          items[items.length - 1].text += ' ' + renderInline(lines[cursor].trim());
          cursor++;
        }
      }
      const listTag = ordered ? 'ol' : 'ul';
      blocks.push(`<${listTag}>` + items.map(item =>
        `<li>${item.text}` +
        (item.children.length ? `<ul>${item.children.map(c => `<li>${c}</li>`).join('')}</ul>` : '') +
        '</li>'
      ).join('') + `</${listTag}>`);
      continue;
    }

    // 문단(빈 줄까지 이어짐)
    const paragraphLines = [];
    while (cursor < lines.length && lines[cursor].trim()
           && !/^\s*(#{1,4}\s|```|>|\||[-*+]\s|\d+\.\s|-{3,}\s*$)/.test(lines[cursor]))
      paragraphLines.push(lines[cursor++]);
    if (paragraphLines.length) blocks.push(`<p>${renderInline(paragraphLines.join(' '))}</p>`);
    else cursor++; // 방어: 어떤 규칙에도 안 걸리면 한 줄 버리고 진행(무한 루프 방지)
  }

  return { html: blocks.join('\n'), toc };
}
