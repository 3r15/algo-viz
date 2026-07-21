// app/renderers/registry.js — 자료구조 type → 렌더러 함수 매핑.
// 렌더러는 registerRenderer('<type>', render) 로 스스로 등록한다.
// render(host, step): host 요소에 step.values 스냅샷을 그린다(요소 재사용).
//
// 새 자료구조(stack/queue/tree/graph…)는 이 레지스트리에 type 을 추가하면
// 플레이어·라우팅 변경 없이 붙는다.

const renderers = new Map();

export function registerRenderer(type, render) {
  renderers.set(type, render);
}

export function getRenderer(type) {
  return renderers.get(type);
}

export function hasRenderer(type) {
  return renderers.has(type);
}
