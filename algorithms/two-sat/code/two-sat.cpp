// 2-SAT — 함의 그래프 + 강한 연결 요소(코사라주)로 충족 가능성 판정.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

int n;                                  // 변수 개수
vector<int> adj[8005], radj[8005], order_;
int comp_[8005];
bool vis[8005];

int node(int v, bool truth) { return truth ? 2*v : 2*v+1; }  // 변수 v 의 참/거짓 정점
int neg(int x) { return x ^ 1; }

void addClause(int a, int b) {          // a, b 는 정점 번호(리터럴)
    adj[neg(a)].push_back(b);           // a 가 거짓이면 b 는 참
    adj[neg(b)].push_back(a);           // b 가 거짓이면 a 는 참
    radj[b].push_back(neg(a));
    radj[a].push_back(neg(b));
}
void dfs1(int u) { vis[u] = true; for (int v : adj[u]) if (!vis[v]) dfs1(v); order_.push_back(u); }
void dfs2(int u, int c) { comp_[u] = c; for (int v : radj[u]) if (comp_[v] < 0) dfs2(v, c); }

bool twoSat() {
    int N = 2*n;
    for (int u = 0; u < N; u++) if (!vis[u]) dfs1(u);
    memset(comp_, -1, sizeof(int)*N);
    int c = 0;
    for (int i = N-1; i >= 0; i--) { int u = order_[i]; if (comp_[u] < 0) dfs2(u, c++); }
    for (int v = 0; v < n; v++)
        if (comp_[node(v,true)] == comp_[node(v,false)]) return false;  // x 와 ¬x 한 SCC
    return true;
}

// 리터럴 L(±변수, 1-based) → 정점
int lit(int L) { int v = abs(L)-1; return L > 0 ? node(v,true) : node(v,false); }

// 입력: 정수쌍(리터럴). SAT 면 배정 출력.
int main() {
    vector<pair<int,int>> cls; int a, b;
    while (cin >> a >> b) { if (a && b) cls.push_back({a,b}); n = max({n, abs(a), abs(b)}); }
    for (auto [x, y] : cls) addClause(lit(x), lit(y));
    if (!twoSat()) { cout << "UNSAT\n"; return 0; }
    cout << "SAT";
    for (int v = 0; v < n; v++) cout << " x" << v+1 << "=" << (comp_[node(v,true)] > comp_[node(v,false)] ? "T" : "F");
    cout << "\n";
    return 0;
}
