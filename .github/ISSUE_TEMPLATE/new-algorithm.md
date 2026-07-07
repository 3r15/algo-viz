---
name: 새 알고리즘 추가
about: 시각화할 알고리즘을 제안/기여합니다
title: "[algo] "
labels: ["algorithm"]
---

## 알고리즘
- 이름 / id(kebab-case):
- 카테고리: (sorting / graph / dp / search / greedy / string / tree / math ...)
- 사용 자료구조: (array / stack / queue / tree / graph / heap ...)
- 시간복잡도: best / avg / worst =
- 공간복잡도:

## 트레이스 생성 방식
- [ ] Model A (generator.js)
- [ ] Model 2 (C++ → WASM)

## 새 렌더러 필요 여부
- [ ] 기존 렌더러로 충분 (array 등)
- [ ] 새 자료구조 렌더러 필요 → 어떤 구조:

## 체크리스트
- [ ] `.claude/skills/add-algorithm/SKILL.md` 절차를 따름
- [ ] `node scripts/validate-trace.mjs algorithms/<id>/generator.js` 통과
- [ ] 경계 입력(빈/단일/정렬/역정렬/중복)에서 확인
- [ ] Model 2 가 있다면 Model A 와 동치(LOCK) 확인
