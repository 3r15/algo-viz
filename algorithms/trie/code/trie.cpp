// 트라이 (접두사 트리) — 글자 단위 트리로 문자열 집합을 저장.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

struct Node { int next[26]; bool end; };     // 26개 자식 + 단어 끝
vector<Node> t(1);                            // t[0] = 루트
void insert(string s) {
    int cur = 0;
    for (char ch : s) {
        int c = ch - 'a';
        if (t[cur].next[c] == 0) {            // 자식이 없으면 새로
            t[cur].next[c] = t.size();
            t.push_back({});
        }
        cur = t[cur].next[c];                 // 한 글자 내려간다
    }
    t[cur].end = true;                        // 여기서 단어가 끝난다
}
bool search(string s) {
    int cur = 0;
    for (char ch : s) {
        int c = ch - 'a';
        if (t[cur].next[c] == 0) return false; // 길이 끊기면 없음
        cur = t[cur].next[c];
    }
    return t[cur].end;                        // 접두사 말고 단어인가
}

// 입력: 첫 줄에 단어들(공백 구분), 둘째 줄에 검색어 하나.
int main() {
    string line;
    getline(cin, line);
    { istringstream ss(line); string w; while (ss >> w) insert(w); }
    string q;
    if (cin >> q) cout << q << " -> " << (search(q) ? "word" : "not-a-word") << "\n";
    return 0;
}
