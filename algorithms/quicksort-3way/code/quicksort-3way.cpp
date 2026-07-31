// 3-way 파티션 퀵 정렬 (네덜란드 국기) — 중복에 강한 퀵 정렬.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

// 3-way 파티션 퀵 정렬 (네덜란드 국기) — 중복에 강하다
void sort3(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[lo];
    int lt = lo, gt = hi, i = lo + 1;
    while (i <= gt) {
        if (a[i] < pivot)      swap(a[lt++], a[i++]); // 작으면 왼쪽으로
        else if (a[i] > pivot) swap(a[i], a[gt--]);   // 크면 오른쪽으로
        else                   i++;                    // 같으면 가운데
    }
    // a[lt..gt] 는 피벗과 같음 → 최종 위치 확정
    sort3(a, lo, lt - 1);
    sort3(a, gt + 1, hi);
}

// 입력: 정수 배열. 정렬 결과 출력.
int main() {
    vector<int> a;
    for (int x; cin >> x; ) a.push_back(x);
    sort3(a, 0, (int)a.size() - 1);
    for (size_t i = 0; i < a.size(); i++) cout << a[i] << " \n"[i + 1 == a.size()];
    return 0;
}
