// Forced into the recompiled code (RecompiledFuncs and the patches) when it is built with Emscripten: what it calls
// that N64Recomp doesn't declare for it. Those are the runtime's (librecomp) and this game's replacements of libultra
// functions, rmonPrintf from the patches, and the runtime's event trigger. C lets a call go without a declaration and
// x86-64 doesn't mind the `int f()` it guesses, but WebAssembly checks signatures when it links and turns such a
// call into a trap.
#ifndef BANJO_RECOMPILED_EXTERNS_H
#define BANJO_RECOMPILED_EXTERNS_H

#include "recomp.h"

void osDpGetStatus_recomp(uint8_t* rdram, recomp_context* ctx);
void osDpSetStatus_recomp(uint8_t* rdram, recomp_context* ctx);
void osPfsInit_recomp(uint8_t* rdram, recomp_context* ctx);
void __ll_lshift_recomp(uint8_t* rdram, recomp_context* ctx);
void __ull_rshift_recomp(uint8_t* rdram, recomp_context* ctx);
void rmonPrintf_recomp(uint8_t* rdram, recomp_context* ctx);
// The patches' events (RECOMP_DECLARE_EVENT), which mods can listen to.
void recomp_trigger_event(uint8_t* rdram, recomp_context* ctx, uint32_t event_index);


#endif
