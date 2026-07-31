// 최대 부분합 (카데인) — 연속 부분 배열의 최대 합을 O(n).
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

// 최대 부분 배열 합 (연속 구간)
int kadane(vector<int>& a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < (int)a.size(); i++) {
        cur = max(a[i], cur + a[i]);    // 잇거나, 여기서 새로 시작
        best = max(best, cur);          // 지금까지 최대
    }
    return best;
}

// 입력: 정수 배열. 최대 부분합 출력.
int main() {
    vector<int> a;
    for (int x; cin >> x; ) a.push_back(x);
    if (a.empty()) return 0;
    cout << kadane(a) << "\n";
    return 0;
}
