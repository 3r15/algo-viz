// 볼록 껍질 (앤드루 모노톤 체인) — 정렬 + 외적 부호로 좌회전만 남긴다.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

struct P { long long x, y; bool operator<(const P& o) const { return x != o.x ? x < o.x : y < o.y; } };

long long cross(P O, P A, P B) {              // >0: 좌회전(반시계)
    return (A.x-O.x)*(B.y-O.y) - (A.y-O.y)*(B.x-O.x);
}
vector<P> convexHull(vector<P> p) {
    sort(p.begin(), p.end());                 // x, 그다음 y
    int n = p.size(), k = 0;
    vector<P> h(2*n);
    for (int i = 0; i < n; i++) {             // 아래 껍질
        while (k >= 2 && cross(h[k-2], h[k-1], p[i]) <= 0) k--;
        h[k++] = p[i];
    }
    for (int i = n-2, t = k+1; i >= 0; i--) { // 위 껍질
        while (k >= t && cross(h[k-2], h[k-1], p[i]) <= 0) k--;
        h[k++] = p[i];
    }
    h.resize(k-1);                            // 마지막은 시작점과 겹침
    return h;
}

// 입력: 정수쌍(x y x y …). 껍질 꼭짓점을 반시계 순으로 출력.
int main() {
    vector<P> p;
    long long x, y;
    while (cin >> x >> y) p.push_back({x, y});
    if (p.size() < 3) { for (auto& q : p) cout << q.x << "," << q.y << "\n"; return 0; }
    for (auto& q : convexHull(p)) cout << q.x << "," << q.y << "\n";
    return 0;
}
