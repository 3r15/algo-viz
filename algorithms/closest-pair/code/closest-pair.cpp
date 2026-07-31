// 최근접 점 쌍 (분할 정복) — x 로 나눠 재귀 + 분할선 근처 띠만 검사, O(n log n).
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;
struct P { long long x, y; };

long long d2(const P& a, const P& b) { return (a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y); }

long long brute(vector<P>& p, int lo, int hi) {
    long long best = LLONG_MAX;
    for (int i = lo; i < hi; i++) for (int j = i+1; j < hi; j++) best = min(best, d2(p[i], p[j]));
    return best;
}
// px: x 로 정렬된 점들의 [lo,hi)
long long closest(vector<P>& px, int lo, int hi) {
    int n = hi - lo;
    if (n <= 3) return brute(px, lo, hi);       // 작으면 전수 비교
    int mid = lo + n/2;
    long long midX = px[mid].x;                  // 세로 분할선
    long long dl = closest(px, lo, mid);         // 왼쪽 재귀
    long long dr = closest(px, mid, hi);         // 오른쪽 재귀
    long long d = min(dl, dr);
    vector<P> strip;                             // 분할선에서 ±√d 안의 점
    for (int i = lo; i < hi; i++)
        if ((px[i].x - midX)*(px[i].x - midX) < d) strip.push_back(px[i]);
    sort(strip.begin(), strip.end(), [](const P& a, const P& b){ return a.y < b.y; });
    for (int i = 0; i < (int)strip.size(); i++)
        for (int j = i+1; j < (int)strip.size() && (strip[j].y-strip[i].y)*(strip[j].y-strip[i].y) < d; j++)
            d = min(d, d2(strip[i], strip[j]));
    return d;
}

// 입력: 정수쌍(x y …). 최근접 거리의 제곱 출력.
int main() {
    vector<P> p; long long x, y;
    while (cin >> x >> y) p.push_back({x, y});
    if (p.size() < 2) return 0;
    sort(p.begin(), p.end(), [](const P& a, const P& b){ return a.x != b.x ? a.x < b.x : a.y < b.y; });
    cout << closest(p, 0, p.size()) << "\n";
    return 0;
}
