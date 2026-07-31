// 라빈-카프 (롤링 해시) 문자열 검색 — 해시로 거르고 같을 때만 실제 비교.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

const long long B = 256, M = 1000000007;      // 밑 B, 소수 법 M

int rabinKarp(string t, string p) {           // 밑 B, 소수 법 M
    int n = t.size(), m = p.size();
    long long hp = 0, ht = 0, pw = 1;
    for (int i = 0; i < m; i++) {             // 패턴·첫 창 해시
        hp = (hp*B + p[i]) % M;
        ht = (ht*B + t[i]) % M;
        if (i) pw = pw*B % M;                 // pw = B^(m-1)
    }
    for (int i = 0; i + m <= n; i++) {
        if (ht == hp && t.substr(i,m) == p)   // 해시 같으면 실제 비교
            return i;                         // 찾았다
        if (i + m < n)                        // 창을 한 칸 굴린다
            ht = ((ht - t[i]*pw%M + M)*B + t[i+m]) % M;
    }
    return -1;
}

// 입력: 텍스트 패턴(공백 구분). 첫 등장 위치 출력(-1 = 없음).
int main() {
    string t, p;
    if (!(cin >> t >> p)) return 0;
    cout << rabinKarp(t, p) << "\n";
    return 0;
}
