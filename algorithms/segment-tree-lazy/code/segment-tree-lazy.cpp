// 세그먼트 트리 지연 전파 — 구간 갱신 + 구간 합, 각 O(log n).
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

const int N = 1 << 17;
long long t[4*N], lazy[4*N];

void apply(int i, int l, int r, long long v) {
    t[i] += v * (r - l);                   // 구간 전체에 +v
    lazy[i] += v;                          // 자식엔 나중에(지연)
}
void push(int i, int l, int r) {           // 지연값을 자식으로 내린다
    if (!lazy[i]) return;
    int m = (l + r) / 2;
    apply(2*i, l, m, lazy[i]);
    apply(2*i+1, m, r, lazy[i]);
    lazy[i] = 0;
}
void update(int i,int l,int r,int ql,int qr,long long v) {
    if (qr <= l || r <= ql) return;        // 겹침 없음
    if (ql <= l && r <= qr) { apply(i,l,r,v); return; } // 완전 포함 → 지연
    push(i, l, r);                          // 부분 → 내리고 재귀
    int m = (l + r) / 2;
    update(2*i, l, m, ql, qr, v);
    update(2*i+1, m, r, ql, qr, v);
    t[i] = t[2*i] + t[2*i+1];
}
long long query(int i,int l,int r,int ql,int qr) {
    if (qr <= l || r <= ql) return 0;
    if (ql <= l && r <= qr) return t[i];
    push(i, l, r);
    int m = (l + r) / 2;
    return query(2*i,l,m,ql,qr) + query(2*i+1,m,r,ql,qr);
}

// 입력: n, a[0..n-1]. build 후 update[2,6)+=3, query[1,7) 출력.
int build(vector<int>& a, int i, int l, int r) {
    if (r - l == 1) { t[i] = (l < (int)a.size() ? a[l] : 0); return t[i]; }
    int m = (l + r) / 2;
    t[i] = build(a, 2*i, l, m) + build(a, 2*i+1, m, r);
    return t[i];
}
int main() {
    int n; if (!(cin >> n)) return 0;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    int sz = 1; while (sz < n) sz <<= 1;
    build(a, 1, 0, sz);
    int ul = min(2, n), ur = min(6, n), ql = min(1, n == 1 ? 0 : 1), qr = min(7, n);
    if (ur > ul) update(1, 0, sz, ul, ur, 3);
    cout << query(1, 0, sz, ql, qr) << "\n";
    return 0;
}
