// index-diff.mjs — 생성된 인덱스와 커밋된 파일의 차이를 사람이 읽을 수 있게 설명한다.
//
// 카탈로그(algorithms/index.json · paradigms/index.json)의 진실 원천은 각 폴더의 meta.json 이고,
// index.json 은 그것을 모은 **생성물**이다. 배포는 항상 새로 생성하므로 사이트가 뒤처질 일은 없지만,
// 커밋된 파일이 어긋나면 로컬에서 열었을 때 카탈로그가 실제와 달라진다. CI 가 그것을 막는다.
//
// 의존성 없음(순수 Node).

// 레코드 배열 두 개를 id 기준으로 비교해 "무엇이 달라졌는지" 줄 목록으로 돌려준다.
export function describeRecordDiff(currentRecords, expectedRecords) {
  const currentById = new Map(currentRecords.map(record => [record.id, record]));
  const expectedById = new Map(expectedRecords.map(record => [record.id, record]));
  const lines = [];

  for (const id of expectedById.keys())
    if (!currentById.has(id)) lines.push(`  + ${id} — 폴더에는 있는데 index 에 없음`);
  for (const id of currentById.keys())
    if (!expectedById.has(id)) lines.push(`  - ${id} — index 에만 있고 폴더에는 없음`);
  for (const [id, expected] of expectedById) {
    const current = currentById.get(id);
    if (!current) continue;
    const changed = Object.keys(expected)
      .filter(key => JSON.stringify(current[key]) !== JSON.stringify(expected[key]));
    const removed = Object.keys(current).filter(key => !(key in expected));
    const fields = [...changed, ...removed.map(key => `${key}(삭제됨)`)];
    if (fields.length) lines.push(`  ~ ${id} — 바뀐 필드: ${fields.join(', ')}`);
  }

  if (!lines.length) lines.push('  (필드 차이는 없고 정렬 순서나 서식만 다릅니다)');
  return lines;
}

// CI 에서는 GitHub Actions 주석(annotation)으로도 남겨 PR 화면에서 바로 보이게 한다.
export function reportStaleIndex(outputPath, fixCommand, diffLines) {
  const headline = `${outputPath} 이(가) 최신이 아닙니다 — meta.json 과 어긋납니다`;
  console.error(`❌ ${headline}`);
  for (const line of diffLines) console.error(line);
  console.error(`\n  고치는 법:  ${fixCommand}   (그 뒤 변경된 ${outputPath} 를 커밋)`);
  if (process.env.GITHUB_ACTIONS)
    console.error(`::error file=${outputPath}::${headline}. 로컬에서 \`${fixCommand}\` 실행 후 커밋하세요`);
}
