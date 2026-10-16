#include "cpu-features.h"
#include <unistd.h>
AndroidCpuFamily android_getCpuFamily(void) { return ANDROID_CPU_FAMILY_ARM64; }
uint64_t android_getCpuFeatures(void) { return ANDROID_CPU_ARM64_FEATURE_FP | ANDROID_CPU_ARM64_FEATURE_ASIMD; }
int android_getCpuCount(void) { long n = sysconf(_SC_NPROCESSORS_CONF); return n > 0 ? (int)n : 1; }
