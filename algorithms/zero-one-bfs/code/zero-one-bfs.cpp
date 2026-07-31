// 0-1 BFS — 가중치 0/1 그래프의 최단 경로를 덱으로 O(V+E).
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

const int MAXN = 1005, INF = 1e9;
vector<pair<int,int>> adj[MAXN];   // (v, w) with w in {0,1}
int dist_[MAXN]; bool done_[MAXN];
int n;

void bfs01(int s) {
    for (int i = 0; i < n; i++) dist_[i] = INF, done_[i] = false;
    deque<int> dq;
    dist_[s] = 0; dq.push_back(s);
    while (!dq.empty()) {
        int u = dq.front(); dq.pop_front();
        if (done_[u]) continue;                // 이미 확정
        done_[u] = true;
        for (auto [v, w] : adj[u]) {           // w 는 0 또는 1
            if (dist_[u] + w < dist_[v]) {
                dist_[v] = dist_[u] + w;
                if (w == 0) dq.push_front(v);  //  0이면 앞으로
                else        dq.push_back(v);   //  1이면 뒤로
            }
        }
    }
}

// 입력: n m s, 그다음 m 줄 "u v w"(무방향). s 에서의 최단 거리 출력.
int main() {
    int m, s; if (!(cin >> n >> m >> s)) return 0;
    for (int i = 0; i < m; i++) { int u, v, w; cin >> u >> v >> w; w = w > 0; adj[u].push_back({v,w}); adj[v].push_back({u,w}); }
    bfs01(s);
    for (int i = 0; i < n; i++) cout << i << ":" << (dist_[i]==INF?-1:dist_[i]) << " \n"[i+1==n];
    return 0;
}
