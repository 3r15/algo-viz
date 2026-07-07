// bubble_sort.cpp
// Source of truth for "Model 2" (instrumented C++ compiled to WASM).
//
// The DISPLAYED algorithm (what the user sees in the code panel) is these
// 10 lines. The trace's `line` field points back to these line numbers:
//
//   1  void bubbleSort(vector<int>& a) {
//   2    int n = a.size();
//   3    for (int i = 0; i < n - 1; i++) {
//   4      for (int j = 0; j < n - 1 - i; j++) {
//   5        if (a[j] > a[j + 1]) {
//   6          swap(a[j], a[j + 1]);
//   7        }
//   8      }
//   9    }
//   10 }
//
// Compile native (for testing / reference trace):
//   g++ -std=c++17 -O2 bubble_sort.cpp -o bubble_sort && ./bubble_sort "5 2 9 1 5 6"
//
// Compile to WASM (Model 2 live in browser) — see build.sh.

#include <string>
#include <vector>
#include <sstream>
using std::string;
using std::vector;

// ---- tiny JSON trace recorder ---------------------------------------------
struct Recorder {
    std::ostringstream out;
    bool first = true;
    void beginArray() { out << '['; }
    void endArray()   { out << ']'; }

    void step(int line, int i, int j, const vector<int>& a,
              const string& op, int aIdx, int bIdx, int sortedFrom,
              const string& explain) {
        if (!first) out << ',';
        first = false;
        out << "{\"line\":" << line
            << ",\"i\":" << i
            << ",\"j\":" << j
            << ",\"op\":\"" << op << "\""
            << ",\"a\":" << aIdx
            << ",\"b\":" << bIdx
            << ",\"sortedFrom\":" << sortedFrom
            << ",\"values\":[";
        for (size_t k = 0; k < a.size(); ++k) {
            if (k) out << ',';
            out << a[k];
        }
        out << "],\"explain\":\"" << explain << "\"}";
    }
};

// ---- the instrumented algorithm -------------------------------------------
// Logic is identical to the 10 displayed lines; emit() calls carry the line #.
static string traceBubbleSort(vector<int> a) {
    Recorder R;
    R.beginArray();
    int n = (int)a.size();

    R.step(2, 0, 0, a, "start", -1, -1, n, "정렬 시작");

    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            R.step(5, i, j, a, "compare", j, j + 1, n - i,
                   "a[" + std::to_string(j) + "] 와 a[" + std::to_string(j + 1) + "] 비교");
            if (a[j] > a[j + 1]) {
                std::swap(a[j], a[j + 1]);
                R.step(6, i, j, a, "swap", j, j + 1, n - i,
                       "a[" + std::to_string(j) + "] > a[" + std::to_string(j + 1) + "] 이므로 교환");
            }
        }
        R.step(3, i, 0, a, "pass-end", -1, -1, n - 1 - i,
               "패스 완료 — 뒤쪽 " + std::to_string(i + 1) + "개 확정");
    }

    R.step(10, 0, 0, a, "done", -1, -1, 0, "정렬 완료");
    R.endArray();
    return R.out.str();
}

// ---- entry points ----------------------------------------------------------
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
extern "C" {
// Called from JS with a space/comma-separated string, returns JSON trace.
// The returned pointer stays valid until the next call (static buffer).
EMSCRIPTEN_KEEPALIVE
const char* run_trace(const char* input) {
    static string result;
    vector<int> a;
    std::string s(input ? input : "");
    for (char& c : s) if (c == ',') c = ' ';
    std::istringstream iss(s);
    int x;
    while (iss >> x) a.push_back(x);
    result = traceBubbleSort(a);
    return result.c_str();
}
}
#else
#include <iostream>
int main(int argc, char** argv) {
    vector<int> a;
    if (argc > 1) {
        std::string s(argv[1]);
        for (char& c : s) if (c == ',') c = ' ';
        std::istringstream iss(s);
        int x;
        while (iss >> x) a.push_back(x);
    } else {
        a = {5, 2, 9, 1, 5, 6};
    }
    std::cout << traceBubbleSort(a) << std::endl;
    return 0;
}
#endif
