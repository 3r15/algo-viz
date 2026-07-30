// 유니온 파인드 (서로소 집합, DSU) — 경로 압축 + 크기로 합치기.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

const int MAXN = 1005;
int parent[MAXN], sz[MAXN];

void init(int n) {
    for (int i = 0; i < n; i++) parent[i] = i, sz[i] = 1;   // 각자 자기 집합
}
int find(int x) {
    if (parent[x] == x) return x;             // 뿌리를 찾았다
    return parent[x] = find(parent[x]);       // 경로 압축: 뿌리에 직접 매단다
}
void unite(int a, int b) {
    a = find(a); b = find(b);                 // 각자의 뿌리
    if (a == b) return;                       // 이미 같은 집합
    if (sz[a] < sz[b]) swap(a, b);            // 큰 나무에 붙인다(랭크)
    parent[b] = a;                            // b 의 뿌리를 a 아래로
    sz[a] += sz[b];                           // 크기 합치기
}

// 입력: 정수들을 쌍으로 읽어 unite. 끝나면 각 원소의 뿌리를 출력.
int main() {
    vector<int> nums;
    for (int x; cin >> x; ) nums.push_back(abs(x));
    if (nums.size() < 2) return 0;
    int n = min(12, max(2, *max_element(nums.begin(), nums.end()) + 1));
    init(n);
    for (size_t i = 0; i + 1 < nums.size(); i += 2)
        unite(nums[i] % n, nums[i + 1] % n);
    for (int i = 0; i < n; i++) cout << i << "->" << find(i) << "\n";
    return 0;
}
