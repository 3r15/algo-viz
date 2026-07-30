// 최대 유량 / 최소 컷 (에드몬드-카프) — 잔여 그래프 + BFS 증가 경로.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

const int MAXN = 64, INF = 1e9;
int cap[MAXN][MAXN], n;

int maxflow(int s, int t) {                  // s=소스, t=싱크
    int flow = 0;
    while (true) {
        vector<int> par(n, -1); par[s] = s;   // BFS 로 증가 경로
        queue<int> q; q.push(s);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v = 0; v < n; v++)
                if (par[v] < 0 && cap[u][v] > 0)
                    par[v] = u, q.push(v);
        }
        if (par[t] < 0) break;                // 더 못 보내면 끝
        int bott = INF;                        // 경로의 최소 잔여 = 병목
        for (int v = t; v != s; v = par[v])
            bott = min(bott, cap[par[v]][v]);
        for (int v = t; v != s; v = par[v])    // 잔여 그래프 갱신
            cap[par[v]][v] -= bott, cap[v][par[v]] += bott;
        flow += bott;
    }
    return flow;                              // 최대 유량 = 최소 컷
}

// 입력: n m, 그다음 m 줄 "u v c". 소스 0, 싱크 n-1 의 최대 유량 출력.
int main() {
    int m; if (!(cin >> n >> m)) return 0;
    for (int i = 0; i < m; i++) { int u, v, c; cin >> u >> v >> c; cap[u][v] += c; }
    cout << maxflow(0, n - 1) << "\n";
    return 0;
}
