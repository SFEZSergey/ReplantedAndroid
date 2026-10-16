/* Минимальная замена cpufeatures из NDK для сборки SDL2 под Android в Termux (только arm64). */
#ifndef CPU_FEATURES_H
#define CPU_FEATURES_H
#include <stdint.h>
#include <sys/cdefs.h>
__BEGIN_DECLS
typedef enum { ANDROID_CPU_FAMILY_UNKNOWN = 0, ANDROID_CPU_FAMILY_ARM, ANDROID_CPU_FAMILY_X86, ANDROID_CPU_FAMILY_MIPS, ANDROID_CPU_FAMILY_ARM64, ANDROID_CPU_FAMILY_X86_64, ANDROID_CPU_FAMILY_MIPS64, ANDROID_CPU_FAMILY_MAX } AndroidCpuFamily;
enum { ANDROID_CPU_ARM_FEATURE_ARMv7 = (1 << 0), ANDROID_CPU_ARM_FEATURE_VFPv3 = (1 << 1), ANDROID_CPU_ARM_FEATURE_NEON = (1 << 2) };
enum { ANDROID_CPU_ARM64_FEATURE_FP = (1 << 0), ANDROID_CPU_ARM64_FEATURE_ASIMD = (1 << 1), ANDROID_CPU_ARM64_FEATURE_AES = (1 << 2), ANDROID_CPU_ARM64_FEATURE_PMULL = (1 << 3), ANDROID_CPU_ARM64_FEATURE_SHA1 = (1 << 4), ANDROID_CPU_ARM64_FEATURE_SHA2 = (1 << 5), ANDROID_CPU_ARM64_FEATURE_CRC32 = (1 << 6) };
AndroidCpuFamily android_getCpuFamily(void);
uint64_t android_getCpuFeatures(void);
int android_getCpuCount(void);
__END_DECLS
#endif
