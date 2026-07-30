// 단조 스택 — 다음 큰 원소(next greater element)를 O(n) 에.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

vector<int> nextGreater(vector<int>& a) {
    int n = a.size();
    vector<int> ans(n, -1);              // 기본: 없음
    stack<int> st;                        // 값이 감소하는 인덱스 스택
    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[st.top()] < a[i]) {
            ans[st.top()] = a[i];         // a[i] 가 그 원소의 다음 큰 값
            st.pop();
        }
        st.push(i);                       // i 를 쌓는다
    }
    return ans;                           // 남은 것은 -1(없음)
}

// 입력: 정수 배열. 각 원소의 다음 큰 원소를 출력(-1 = 없음).
int main() {
    vector<int> a;
    for (int x; cin >> x; ) a.push_back(x);
    vector<int> ans = nextGreater(a);
    for (int i = 0; i < (int)ans.size(); i++) cout << ans[i] << " \n"[i + 1 == (int)ans.size()];
    return 0;
}
