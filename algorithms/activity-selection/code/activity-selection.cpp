// 활동 선택 (그리디) — 끝나는 시각 순으로 겹치지 않게 최대 개수.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;
struct Act { int start, end; };
const int INF = 1e9;

// 활동 (start, end) 들 중 겹치지 않게 최대 개수
int activitySelection(vector<Act>& a) {
    sort(a.begin(), a.end(), [](const Act& x, const Act& y){ return x.end < y.end; }); // 끝나는 시각 오름차순
    int count = 0, lastEnd = -INF;
    for (Act act : a) {
        if (act.start >= lastEnd) {         // 직전 선택과 안 겹치면
            count++;                        // 선택한다
            lastEnd = act.end;              // 끝 시각 갱신
        }
    }
    return count;                           // 최대 개수
}

// 입력: 정수쌍(s e). 선택 가능한 최대 활동 수 출력.
int main() {
    vector<Act> a; int s, e;
    while (cin >> s >> e) a.push_back({s, e});
    cout << activitySelection(a) << "\n";
    return 0;
}
