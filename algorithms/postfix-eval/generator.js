// algorithms/postfix-eval/generator.js — Model A 생성기(후위 표기법 계산, 스택).
//
// 후위 표기법(RPN)은 연산자가 피연산자 뒤에 온다: "3 4 +" = 3 + 4.
//   왼쪽부터 읽어 숫자면 스택에 넣고, 연산자면 위에서 둘을 꺼내 계산해 결과를 도로 넣는다.
//   괄호도 우선순위 규칙도 필요 없다 — 순서가 이미 계산 순서다. 그래서 계산기가 내부적으로 쓴다.
//
// 입력은 공백으로 구분한 토큰들(inputKind='text'). 숫자와 + - * / 만 받는다.
//
// 시각화: stack 슬롯. 숫자가 쌓이고, 연산자에서 둘을 꺼내 하나로 합친다.
//   칸 상태: 0 기본 · 1 top · 2 방금 push(결과) · 3 방금 pop(피연산자) · 4 계산에 쓰인 둘

export const category = 'string';
export const inputKind = 'text';
export const defaultInput = '3 4 + 5 *';
export const inputLabel = '후위식';
export const inputHint = '연산자가 뒤에 오는 식(3 4 + 는 3+4). 숫자와 + - * / 를 공백으로 구분한다.';

const OPERATORS = new Set(['+', '-', '*', '/']);
const MAX_TOKENS = 16;

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const samples = ['5 1 2 + 4 * + 3 -', '2 3 4 * +', '10 2 / 3 -', '6 2 3 + *', '8 4 - 2 *', '1 2 + 3 4 + *'];
  return samples[Math.floor(Math.random() * samples.length)];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int evalRPN(vector<string>& tokens) {',
  '    stack<int> st;',
  '    for (string& t : tokens) {',
  '        if (isOperator(t)) {',
  '            int b = st.top(); st.pop();       // 나중 것이 오른쪽 피연산자',
  '            int a = st.top(); st.pop();       // 먼저 것이 왼쪽',
  '            st.push(apply(a, t, b));          // 계산해 도로 넣는다',
  '        } else {',
  '            st.push(stoi(t));                 // 숫자 → 쌓는다',
  '        }',
  '    }',
  '    return st.top();                          // 마지막 하나가 답',
  '}',
];

function apply(a, operator, b) {
  switch (operator) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? null : Math.trunc(a / b);   // 0 나누기는 실패 신호
    default: return null;
  }
}

export function generate(input) {
  const text = typeof input === 'string' ? input : String(input ?? '');
  const tokens = text.trim().split(/\s+/).filter(Boolean).slice(0, MAX_TOKENS);

  const stack = [];                    // 정수 스택(아래→위)
  const origin = [];                   // 각 값이 어디서 왔나(라벨: 입력 번호 또는 '계산')
  const steps = [];
  let caption = '';

  const snapshot = (topState) => {
    const states = stack.map((_, index) => (index === stack.length - 1 ? 1 : 0));
    if (topState != null && stack.length) states[stack.length - 1] = topState;
    return { values: stack.slice(), states, labels: origin.slice(), caption };
  };

  const pushStep = (line, op, explain, stackSlot, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: [],                        // 배열 자료구조가 없다 — 스택이 전부다
    sortedFrom: 0,
    stack: stackSlot,
    explain,
  });

  if (!tokens.length) {
    caption = '빈 입력';
    pushStep(12, 'done', '토큰이 없다 — 계산할 것이 없다', snapshot());
    return steps;
  }

  caption = `${tokens.join(' ')} 를 왼쪽부터 읽는다`;
  pushStep(3, 'start',
    `후위식 "${tokens.join(' ')}" 을 계산한다. 숫자는 쌓고, 연산자는 위에서 둘을 꺼내 계산한다`,
    snapshot());

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (OPERATORS.has(token)) {
      if (stack.length < 2) {
        caption = `'${token}' — 피연산자가 부족하다`;
        pushStep(4, 'done',
          `연산자 '${token}' 를 만났는데 스택에 값이 ${stack.length}개뿐이다 → ` +
          `두 개가 필요하다. 잘못된 후위식이다`, snapshot(), { a: i });
        return steps;
      }

      // 나중에 넣은 것이 오른쪽 피연산자(b), 먼저 넣은 것이 왼쪽(a)
      const right = stack[stack.length - 1];
      const left = stack[stack.length - 2];
      caption = `'${token}' — 위의 둘 ${left}, ${right} 를 꺼낸다`;
      pushStep(5, 'read',
        `연산자 '${token}' → 맨 위 둘을 꺼낸다: 오른쪽 = ${right}, 왼쪽 = ${left}`,
        snapshot(4), { a: i });

      const result = apply(left, token, right);
      if (result === null) {
        caption = `${left} / ${right} — 0 으로 나눌 수 없다`;
        pushStep(7, 'done',
          `${left} ${token} ${right} 은 0 으로 나누기라 계산할 수 없다`, snapshot(4), { a: i });
        return steps;
      }

      stack.pop(); stack.pop();
      origin.pop(); origin.pop();
      stack.push(result);
      origin.push('계산');

      caption = `${left} ${token} ${right} = ${result} → 도로 넣는다`;
      pushStep(7, 'push',
        `${left} ${token} ${right} = ${result} 을 계산해 스택에 도로 넣는다. ` +
        `두 값이 하나로 줄었다`, snapshot(2), { a: i });
      continue;
    }

    // 숫자 토큰
    const value = Number(token);
    if (!Number.isFinite(value) || !/^-?\d+$/.test(token)) {
      caption = `'${token}' — 알 수 없는 토큰`;
      pushStep(9, 'done',
        `'${token}' 은 숫자도 연산자(+ - * /)도 아니다 → 계산할 수 없다`, snapshot(), { a: i });
      return steps;
    }

    stack.push(value);
    origin.push(`${i}번`);
    caption = `${value} — 숫자, 쌓는다`;
    pushStep(9, 'push',
      `${i}번 토큰 '${token}' 은 숫자 → 스택에 넣는다`, snapshot(2), { a: i });
  }

  if (stack.length !== 1) {
    caption = `끝났는데 값이 ${stack.length}개 남았다`;
    pushStep(12, 'done',
      `계산이 끝났는데 스택에 값이 ${stack.length}개다(${stack.join(', ')}). ` +
      `올바른 후위식이라면 정확히 하나가 남아야 한다`, snapshot());
    return steps;
  }

  caption = `완성 — 결과 ${stack[0]}`;
  pushStep(12, 'done',
    `스택에 하나만 남았다 → 그것이 답이다: ${stack[0]}`, snapshot(4));
  return steps;
}
