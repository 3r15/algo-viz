// algorithms/balanced-parentheses/generator.js — Model A 생성기(괄호 검사, 스택).
//
// 여는 괄호를 만나면 스택에 넣고, 닫는 괄호를 만나면 스택 맨 위와 짝이 맞는지 본다.
//   짝이 맞으면 pop, 안 맞으면 실패. 끝났을 때 스택이 비어 있으면 균형 잡힌 것이다.
// 스택은 "가장 최근에 열린, 아직 안 닫힌 괄호" 를 기억한다 — LIFO 가 딱 맞는 자리다.
//
// 입력은 문자열 하나(inputKind='text'). 괄호가 아닌 문자는 그냥 지나간다.
//
// 시각화: stack 슬롯. 여는 괄호가 쌓이고, 닫을 때 맨 위와 대조한다.
//   칸 상태: 0 기본 · 1 top · 2 방금 push · 3 방금 pop · 4 짝 맞음(잠깐 강조)

export const category = 'string';
export const inputKind = 'text';
export const defaultInput = '(a+[b*c])';
export const inputLabel = '수식';
export const inputHint = "() [] {} 가 올바르게 짝지어졌는지 검사한다. 괄호가 아닌 글자는 무시한다.";

const OPEN = '([{', CLOSE = ')]}';
const MATCH = { ')': '(', ']': '[', '}': '{' };
const MAX_LENGTH = 24;

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const samples = ['(a+b)*[c-d]', '{[()]}', '([)]', '(((', 'a)(b', '[a+(b*c)]', '{a[b]c}d'];
  return samples[Math.floor(Math.random() * samples.length)];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'bool balanced(string s) {',
  '    stack<char> st;',
  '    for (char c : s) {',
  '        if (c == \'(\' || c == \'[\' || c == \'{\')',
  '            st.push(c);                        // 여는 괄호 → 쌓는다',
  '        else if (c == \')\' || c == \']\' || c == \'}\') {',
  '            if (st.empty() || !matches(st.top(), c))',
  '                return false;                  // 짝이 안 맞는다',
  '            st.pop();                          // 짝이 맞으면 뺀다',
  '        }',
  '    }',
  '    return st.empty();                         // 다 닫혔으면 균형',
  '}',
];

export function generate(input) {
  const text = (typeof input === 'string' ? input : String(input ?? '')).slice(0, MAX_LENGTH);

  const stack = [];                    // 여는 괄호 문자들(아래→위)
  const stackIndex = [];               // 각 괄호가 문자열에서 몇 번째였나(라벨용)
  const steps = [];
  let caption = '';

  const snapshot = (highlight = {}) => {
    const states = stack.map((_, index) =>
      index === stack.length - 1 ? 1 : 0);
    if (highlight.topState != null && stack.length)
      states[stack.length - 1] = highlight.topState;
    return {
      values: stack.slice(),
      states,
      labels: stackIndex.map(i => `${i}번`),
      caption,
    };
  };

  // 방금 pop 된 원소를 잔상으로 남길 때 쓴다(값 + 상태 3)
  const snapshotWithGhost = (ghostValue, ghostLabel) => {
    const base = snapshot();
    base.values = [...base.values, ghostValue];
    base.states = [...base.states.map(() => 0), 3];
    base.labels = [...base.labels, ghostLabel];
    return base;
  };

  const pushStep = (line, op, explain, stackSlot, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: [],                        // 배열 자료구조가 없다 — 스택이 전부다
    sortedFrom: 0,
    stack: stackSlot,
    explain,
  });

  if (!text.trim()) {
    caption = '빈 입력';
    pushStep(12, 'done', '입력이 비어 있다 — 균형 잡힌 것으로 본다(닫을 것이 없다)', snapshot());
    return steps;
  }

  caption = `"${text}" 를 왼쪽부터 훑는다`;
  pushStep(3, 'start',
    `"${text}" 의 괄호가 올바르게 짝지어졌는지 본다. 여는 괄호는 쌓고, ` +
    `닫는 괄호는 맨 위와 짝을 맞춘다`, snapshot());

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (OPEN.includes(ch)) {
      stack.push(ch);
      stackIndex.push(i);
      caption = `'${ch}' — 여는 괄호, 쌓는다`;
      pushStep(5, 'push',
        `${i}번 글자 '${ch}' 는 여는 괄호 → 스택에 넣는다. 이 괄호는 아직 닫히지 않았다`,
        snapshot({ topState: 2 }), { a: i });
      continue;
    }

    if (CLOSE.includes(ch)) {
      const expected = MATCH[ch];
      if (stack.length === 0) {
        caption = `'${ch}' — 닫을 짝이 없다`;
        pushStep(8, 'done',
          `${i}번 글자 '${ch}' 는 닫는 괄호인데 스택이 비어 있다 → 열린 적 없는 괄호를 닫으려 한다. ` +
          `균형이 아니다`, snapshot(), { a: i });
        return steps;
      }

      const top = stack[stack.length - 1];
      if (top !== expected) {
        caption = `'${ch}' — 짝이 안 맞는다 ('${top}' 위에)`;
        pushStep(8, 'done',
          `${i}번 글자 '${ch}' 를 닫으려는데 맨 위는 '${top}' 이다. '${ch}' 는 '${expected}' 와 짝이어야 한다 → ` +
          `균형이 아니다`, snapshot({ topState: 3 }), { a: i });
        return steps;
      }

      // 짝이 맞는다 — 먼저 맞음을 강조한 스냅샷, 그다음 pop
      caption = `'${ch}' — 맨 위 '${top}' 와 짝이 맞는다`;
      pushStep(7, 'read',
        `${i}번 글자 '${ch}' 는 맨 위 '${top}' 와 짝이 맞는다 → 뺀다`,
        snapshot({ topState: 4 }), { a: i });

      const poppedIndex = stackIndex.pop();
      stack.pop();
      caption = `'${ch}' — 짝 맞은 괄호를 뺐다`;
      pushStep(9, 'pop',
        `'${top}' (${poppedIndex}번) 을 스택에서 뺐다. 이 괄호 쌍은 올바르게 닫혔다`,
        snapshotWithGhost(top, `${poppedIndex}번`), { a: i, b: poppedIndex });
      continue;
    }

    // 괄호가 아닌 글자는 건너뛴다(스텝을 남기지 않아 트레이스가 짧게)
  }

  if (stack.length > 0) {
    const leftover = stack.map((ch, k) => `'${ch}'(${stackIndex[k]}번)`).join(', ');
    caption = `끝났는데 ${stack.length}개가 안 닫혔다`;
    pushStep(12, 'done',
      `문자열이 끝났지만 스택에 ${stack.length}개가 남았다: ${leftover} → 열고 안 닫은 괄호가 있다. ` +
      `균형이 아니다`, snapshot());
    return steps;
  }

  caption = '스택이 비었다 — 균형 잡힘';
  pushStep(12, 'done',
    `문자열을 다 훑었고 스택이 비어 있다 → 모든 괄호가 올바르게 짝지어졌다. 균형이다`,
    snapshot());
  return steps;
}
