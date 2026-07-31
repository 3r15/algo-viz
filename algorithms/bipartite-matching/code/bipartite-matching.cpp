// 이분 매칭 (쿤 알고리즘) — 증가 경로로 최대 매칭을 찾는다.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

const int MAXN = 1005;
vector<int> adj[MAXN];                    // 왼쪽 u → 오른쪽 이웃들
int matchR[MAXN];                         // 오른쪽 → 짝지은 왼쪽(-1=없음)
bool visited[MAXN];
int R;

bool tryKuhn(int u) {                      // 왼쪽 u 의 증가 경로 찾기
    for (int v : adj[u]) {                // u 의 오른쪽 이웃들
        if (!visited[v]) {
            visited[v] = true;
            if (matchR[v] == -1 || tryKuhn(matchR[v])) {
                matchR[v] = u;            // v 를 u 와 짝짓는다
                return true;
            }
        }
    }
    return false;                         // 증가 경로 없음
}
int maxMatching(int L) {
    int cnt = 0;
    for (int u = 0; u < L; u++) {
        fill(visited, visited + R, false);
        if (tryKuhn(u)) cnt++;            // u 를 매칭에 편입
    }
    return cnt;                           // 최대 매칭 크기
}

// 입력: L R m, 그다음 m 줄 "u v"(u 왼쪽, v 오른쪽). 최대 매칭 크기 출력.
int main() {
    int L, m; if (!(cin >> L >> R >> m)) return 0;
    memset(matchR, -1, sizeof(matchR));
    for (int i = 0; i < m; i++) { int u, v; cin >> u >> v; adj[u].push_back(v); }
    cout << maxMatching(L) << "\n";
    return 0;
}
