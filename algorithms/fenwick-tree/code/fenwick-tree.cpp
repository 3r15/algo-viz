// 펜윅 트리 (이진 인덱스 트리, BIT) — 접두사 합 질의 + 한 점 갱신, 각 O(log n).
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

const int MAXN = 1005;
int t[MAXN], n;                       // 펜윅 트리 (1-based)
int lowbit(int i) { return i & -i; }  // 최하위 1비트
void update(int i, int delta) {       // a[i] += delta
    for (; i <= n; i += lowbit(i))    //   담당 구간들을 타고 오른다
        t[i] += delta;
}
int query(int i) {                    // 접두사 합 a[1..i]
    int sum = 0;
    for (; i > 0; i -= lowbit(i))     //   구간을 이어 붙이며 내려간다
        sum += t[i];
    return sum;
}

// 입력: 정수 배열. 만든 뒤 query(n-1), update(3,+5), query(n-1) 을 출력.
int main() {
    vector<int> a;
    for (int x; cin >> x; ) a.push_back(x);
    n = min(12, (int)a.size());
    for (int i = 1; i <= n; i++) update(i, a[i - 1]);
    int q = max(1, n - 1), pos = min(3, n);
    cout << "query(" << q << ")=" << query(q) << "\n";
    update(pos, 5);
    cout << "query(" << q << ")=" << query(q) << "\n";
    return 0;
}
