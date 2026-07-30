// algorithms/knapsack/generator.js — Model A 생성기(0/1 배낭 문제).
//
// dp[i][w] = 앞 i 개 물건만 후보로 둘 때, 무게 한도 w 에서 얻을 수 있는 최대 가치.
//   물건 i 를 볼 때 선택지는 딱 둘이다 — 안 담거나(dp[i-1][w]), 담거나(dp[i-1][w-무게] + 가치).
//   "앞 i 개" 로 상태를 나누면 각 물건이 정확히 한 번만 고려되어 0/1 조건이 자동으로 지켜진다.
//
// 입력 형식: "용량 w1 v1 w2 v2 …" — 첫 수가 배낭 용량, 그 뒤로 (무게, 가치) 쌍.
//
// 시각화: matrix 슬롯(dp 표) 하나. 배열 자료구조가 없으므로 values 는 항상 빈 배열이다.
//   셀 상태: 1 채워짐 · 2 읽는 중(윗줄의 두 후보) · 3 방금 씀 · 4 결과(역추적 경로)

export const category = 'dp';
export const defaultInput = [10, 5, 10, 4, 40, 6, 30, 3, 50];
export const inputLabel = '용량 w v w v …';
export const inputHint = '첫 수가 배낭 용량, 그 뒤로 (무게, 가치) 쌍. 물건은 쪼갤 수 없고 하나씩만 있다.';

const MAX_CAPACITY = 16;        // 표의 열 수 = 용량 + 1 이라 화면 폭에 맞춰 제한한다
const MAX_ITEMS = 6;

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const itemCount = 3 + Math.floor(Math.random() * 2);
  const numbers = [8 + Math.floor(Math.random() * 5)];
  for (let index = 0; index < itemCount; index++) {
    numbers.push(2 + Math.floor(Math.random() * 5));         // 무게
    numbers.push(10 * (1 + Math.floor(Math.random() * 6)));  // 가치
  }
  return numbers;
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// dp[i][w] = 앞 i 개 물건만 쓸 때, 한도 w 에서의 최대 가치',
  'int knapsack(vector<int>& weight, vector<int>& value, int n, int cap) {',
  '    vector<vector<int>> dp(n + 1, vector<int>(cap + 1, 0));',
  '    for (int i = 1; i <= n; i++) {',
  '        for (int w = 0; w <= cap; w++) {',
  '            dp[i][w] = dp[i-1][w];                 // i 를 안 담는다',
  '            if (weight[i] <= w)                    // 담을 수 있으면',
  '                dp[i][w] = max(dp[i][w],           //   안 담기 vs',
  '                               dp[i-1][w - weight[i]] + value[i]);  //   담기',
  '        }',
  '    }',
  '    return dp[n][cap];      // 역추적하면 어떤 물건을 담았는지 알 수 있다',
  '}',
];

function parseItems(input) {
  const numbers = (Array.isArray(input) && input.length) ? input : defaultInput;
  const capacity = Math.max(0, Math.min(MAX_CAPACITY, Math.trunc(numbers[0]) || 0));
  const items = [];
  for (let index = 1; index + 1 < numbers.length && items.length < MAX_ITEMS; index += 2) {
    const weight = Math.max(1, Math.trunc(numbers[index]));
    const value = Math.max(0, Math.trunc(numbers[index + 1]));
    items.push({ weight, value });
  }
  return { capacity, items };
}

export function generate(input) {
  const { capacity, items } = parseItems(input);
  const itemCount = items.length;

  if (!itemCount || capacity === 0) {
    return [{
      line: 3, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [],
      explain: '"용량 w v w v …" 형식으로 입력하세요 (예: 10 5 10 4 40 6 30 3 50)',
    }];
  }

  // dp 는 (itemCount+1) × (capacity+1). 0행은 "물건이 하나도 없을 때" 라 전부 0 이다.
  const dp = Array.from({ length: itemCount + 1 }, () => new Array(capacity + 1).fill(0));
  const cellState = Array.from({ length: itemCount + 1 }, () => new Array(capacity + 1).fill(0));

  const rowLabels = ['물건 없음', ...items.map((item, index) =>
    `${index + 1}: w${item.weight} v${item.value}`)];
  const colLabels = Array.from({ length: capacity + 1 }, (_, w) => String(w));
  let caption = `용량 ${capacity}, 물건 ${itemCount}개`;

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    ...(extra.i != null ? { i: extra.i } : {}),
    ...(extra.j != null ? { j: extra.j } : {}),
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: [],                          // 배열 자료구조가 없다 — 표가 전부다
    sortedFrom: 0,
    matrix: {
      rows: itemCount + 1, cols: capacity + 1,
      values: dp.flat(),
      states: cellState.flat(),
      rowLabels, colLabels, caption,
    },
    explain,
  });

  // 이미 계산된 칸(0행 포함)을 "채워짐" 으로 되돌린다. 강조는 그 위에 덧칠한다.
  const clearHighlights = (upToRow, upToCol) => {
    for (let i = 0; i <= itemCount; i++)
      for (let w = 0; w <= capacity; w++)
        cellState[i][w] = (i === 0 || i < upToRow || (i === upToRow && w <= upToCol)) ? 1 : 0;
  };

  clearHighlights(0, capacity);
  caption = '0행 — 담을 물건이 없으면 어떤 한도에서도 가치는 0';
  pushStep(3, 'start',
    `용량 ${capacity} 짜리 배낭에 물건 ${itemCount}개. ` +
    '0행은 "물건이 하나도 없을 때" 라 전부 0 으로 시작한다');

  for (let i = 1; i <= itemCount; i++) {
    const { weight, value } = items[i - 1];

    for (let w = 0; w <= capacity; w++) {
      const skipValue = dp[i - 1][w];                     // i 를 안 담았을 때
      const fits = weight <= w;
      const takeValue = fits ? dp[i - 1][w - weight] + value : -1;

      if (fits && takeValue > skipValue) {
        dp[i][w] = takeValue;
        clearHighlights(i, w);
        cellState[i - 1][w] = 2;
        cellState[i - 1][w - weight] = 2;
        cellState[i][w] = 3;
        caption = `물건 ${i} (w${weight} v${value}) — 한도 ${w} 에서는 담는 쪽이 이득`;
        pushStep(8, 'write',
          `한도 ${w}: 안 담으면 ${skipValue}, 담으면 남는 한도 ${w - weight} 의 ${dp[i - 1][w - weight]} 에 ` +
          `${value} 를 더해 ${takeValue} → 담는다`,
          { i, j: w });
      } else {
        dp[i][w] = skipValue;
        clearHighlights(i, w);
        cellState[i - 1][w] = 2;
        if (fits) cellState[i - 1][w - weight] = 2;
        cellState[i][w] = 3;
        const reason = !fits
          ? `무게 ${weight} 가 한도 ${w} 를 넘어 담을 수 없다`
          : `담으면 ${takeValue} 로, 안 담을 때의 ${skipValue} 보다 낫지 않다`;
        caption = `물건 ${i} (w${weight} v${value}) — 한도 ${w} 에서는 그대로 물려받는다`;
        pushStep(6, 'write', `한도 ${w}: ${reason} → 윗줄 값 ${skipValue} 를 그대로 쓴다`, { i, j: w });
      }
    }
  }

  // 오른쪽 아래에서 거슬러 올라가며 어떤 물건을 담았는지 복원한다.
  const chosen = [];
  let remaining = capacity;
  for (let i = itemCount; i >= 1; i--) {
    if (dp[i][remaining] === dp[i - 1][remaining]) continue;   // 값이 같으면 안 담은 것
    chosen.push(i);
    remaining -= items[i - 1].weight;
  }
  chosen.reverse();

  clearHighlights(itemCount, capacity);
  let traceColumn = capacity;
  for (let i = itemCount; i >= 1; i--) {
    if (chosen.includes(i)) {
      cellState[i][traceColumn] = 4;
      traceColumn -= items[i - 1].weight;
    }
  }
  cellState[itemCount][capacity] = 4;

  const usedWeight = chosen.reduce((sum, i) => sum + items[i - 1].weight, 0);
  caption = `완성 — 최대 가치 ${dp[itemCount][capacity]}`;
  pushStep(12, 'done',
    `dp[${itemCount}][${capacity}] = ${dp[itemCount][capacity]} 가 답이다. ` +
    (chosen.length
      ? `담은 물건은 ${chosen.join(', ')}번 (무게 합 ${usedWeight}/${capacity})`
      : '아무것도 담지 못했다'));

  return steps;
}
