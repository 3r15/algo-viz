// 퀵셀렉트 — k번째 최솟값을 정렬 없이 평균 O(n).
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

// k번째 최솟값 (0-based) — 한쪽만 이어서 본다
int quickSelect(vector<int>& a, int k) {
    int lo = 0, hi = a.size() - 1;
    while (lo < hi) {
        int pivot = a[hi], i = lo;
        for (int j = lo; j < hi; j++)
            if (a[j] < pivot) swap(a[i++], a[j]);
        swap(a[i], a[hi]);              // 피벗을 제자리 i 로
        if (i == k) break;              // 찾았다
        else if (i < k) lo = i + 1;     // 오른쪽만
        else            hi = i - 1;     // 왼쪽만
    }
    return a[k];
}

// 입력: 정수 배열. k = n/2(중앙값)번째 최솟값 출력.
int main() {
    vector<int> a;
    for (int x; cin >> x; ) a.push_back(x);
    if (a.empty()) return 0;
    cout << quickSelect(a, a.size() / 2) << "\n";
    return 0;
}
