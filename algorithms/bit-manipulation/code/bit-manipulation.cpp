// 비트 조작 — n개 원소의 모든 부분집합을 비트마스크로 열거.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

// 입력: 정수 배열(최대 5). 최대 합 부분집합을 출력.
int main() {
    vector<int> a;
    for (int x; cin >> x; ) a.push_back(x);
    int n = min(5, (int)a.size());

    // n개 원소의 모든 부분집합을 비트마스크로 열거 (2^n 가지)
    int best = 0, bestMask = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        int sum = 0;
        for (int j = 0; j < n; j++)
            if (mask & (1 << j))          // j번 비트가 켜졌나
                sum += a[j];              // j번 원소를 넣는다
        if (sum > best) {                 // 더 큰 합을 갱신
            best = sum;
            bestMask = mask;
        }
    }
    cout << "best sum = " << best << " (mask " << bestMask << ")\n";
    return 0;
}
