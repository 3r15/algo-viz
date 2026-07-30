// 밀러-라빈 소수 판정 — n-1 = d·2^s 분해 + 증인별 제곱 수열.
// 표시 코드(generator.js 의 code[])와 알고리즘 줄을 맞춘 참조 구현.
#include <bits/stdc++.h>
using namespace std;

long long modpow(long long a, long long e, long long m) {
    long long r = 1; a %= m;
    for (; e; e >>= 1) { if (e & 1) r = (__int128)r*a%m; a = (__int128)a*a%m; }
    return r;
}
bool isPrime(long long n) {
    if (n < 2) return false;
    if (n % 2 == 0) return n == 2;
    long long d = n - 1; int s = 0;
    while (d % 2 == 0) { d /= 2; s++; }        // n-1 = d·2^s
    for (long long a : {2,3,5,7,11,13,17,19,23,29,31,37}) {
        if (a % n == 0) continue;
        long long x = modpow(a, d, n);         // a^d mod n
        if (x == 1 || x == n-1) continue;      // 이 증인 통과
        bool witness = true;
        for (int r = 1; r < s; r++) {
            x = (__int128)x*x % n;             // 계속 제곱
            if (x == n-1) { witness = false; break; }
        }
        if (witness) return false;             // a 가 합성 증인
    }
    return true;                               // 아마도 소수
}

// 입력: 정수 n 하나. 소수/합성 판정을 출력.
int main() {
    long long n;
    if (!(cin >> n)) return 0;
    cout << n << " -> " << (isPrime(n) ? "prime" : "composite") << "\n";
    return 0;
}
