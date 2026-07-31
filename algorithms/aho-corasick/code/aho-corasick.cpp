// 아호-코라식 — 트라이 + 실패 링크로 다중 패턴을 텍스트 한 번 훑기에 찾는다.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

const int MAXN = 100005;
int go_[MAXN][26], fail[MAXN], cnt = 1;      // 노드 0 = 루트
vector<int> out_[MAXN];                       // 노드에서 끝나는 패턴 인덱스

void insert(const string& p, int id) {
    int u = 0;
    for (char ch : p) { int c = ch-'a'; if (!go_[u][c]) go_[u][c] = cnt++; u = go_[u][c]; }
    out_[u].push_back(id);
}
void build() {                                // 실패 링크 계산(BFS)
    queue<int> q;
    for (int c = 0; c < 26; c++)
        if (go_[0][c]) fail[go_[0][c]] = 0, q.push(go_[0][c]);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int c = 0; c < 26; c++) if (int v = go_[u][c]) {
            int f = fail[u];
            while (f && !go_[f][c]) f = fail[f];
            fail[v] = go_[f][c];              // 부모 fail 을 따라
            for (int x : out_[fail[v]]) out_[v].push_back(x);  // 접미사 패턴 상속
            q.push(v);
        }
    }
}
void search(const string& t, vector<string>& pats) {
    int u = 0;
    for (int i = 0; i < (int)t.size(); i++) {
        int c = t[i]-'a';
        while (u && !go_[u][c]) u = fail[u];  // 막히면 fail 로
        u = go_[u][c];                        // 전이(없으면 0)
        for (int id : out_[u])
            cout << pats[id] << "@" << i - (int)pats[id].size() + 1 << "\n";
    }
}

// 입력: 첫 줄 텍스트, 둘째 줄 패턴들(공백 구분).
int main() {
    string text, line;
    getline(cin, text);
    getline(cin, line);
    vector<string> pats; { istringstream ss(line); string w; while (ss >> w) pats.push_back(w); }
    for (int i = 0; i < (int)pats.size(); i++) insert(pats[i], i);
    build();
    search(text, pats);
    return 0;
}
