/* sys/sem.h для сборки box64 под bionic в Termux (в ndk-sysroot Termux его нет; в NDK есть). */
#ifndef BOX64_COMPAT_SYS_SEM_H
#define BOX64_COMPAT_SYS_SEM_H
#include <sys/ipc.h>
#include <sys/types.h>
#include <linux/sem.h>
/* Как в bionic: */
#define semid_ds semid64_ds
union semun {
    int val;
    struct semid_ds* buf;
    unsigned short* array;
    struct seminfo* __buf;
    void* __pad;
};
#ifdef __cplusplus
extern "C" {
#endif
int semctl(int, int, int, ...);
int semget(key_t, int, int);
int semop(int, struct sembuf*, size_t);
int semtimedop(int, struct sembuf*, size_t, const struct timespec*);
#ifdef __cplusplus
}
#endif
#endif
