// 최소 비용 최대 유량 (MCMF) — 최단 비용 증가 경로(SPFA)로 흘린다.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;
const int INF = 1e9;

int n;
vector<int> to_, cap, cost_, from_;
vector<vector<int>> g;
void addEdge(int u, int v, int c, int w) {
    g[u].push_back(to_.size()); to_.push_back(v); from_.push_back(u); cap.push_back(c); cost_.push_back(w);
    g[v].push_back(to_.size()); to_.push_back(u); from_.push_back(v); cap.push_back(0); cost_.push_back(-w);
}
int mcmf(int s, int t) {                     // 최소 비용, 최대 유량
    int flow = 0, cost = 0;
    while (true) {
        vector<int> dist(n, INF), par(n, -1); vector<bool> inq(n, false);
        dist[s] = 0; queue<int> q; q.push(s); inq[s] = true;
        while (!q.empty()) {                  // SPFA: 최단 비용 증가 경로
            int u = q.front(); q.pop(); inq[u] = false;
            for (int e : g[u]) if (cap[e] > 0 && dist[u] + cost_[e] < dist[to_[e]]) {
                dist[to_[e]] = dist[u] + cost_[e]; par[to_[e]] = e;
                if (!inq[to_[e]]) inq[to_[e]] = true, q.push(to_[e]);
            }
        }
        if (dist[t] == INF) break;            // 더 못 보내면 끝
        int bott = INF;
        for (int v = t; v != s; v = from_[par[v]]) bott = min(bott, cap[par[v]]);
        for (int v = t; v != s; v = from_[par[v]]) { cap[par[v]] -= bott; cap[par[v] ^ 1] += bott; }
        flow += bott;
        cost += bott * dist[t];               // 이 경로 단가 × 유량
    }
    return cost;                              // 최대 유량에서 최소 비용
}

// 입력: n m, 그다음 m 줄 "u v cap cost". 소스 0, 싱크 n-1 의 최소 비용 출력.
int main() {
    int m; if (!(cin >> n >> m)) return 0;
    g.assign(n, {});
    for (int i = 0; i < m; i++) { int u, v, c, w; cin >> u >> v >> c >> w; addEdge(u, v, c, w); }
    cout << mcmf(0, n - 1) << "\n";
    return 0;
}
