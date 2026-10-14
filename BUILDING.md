# Building Guide

This guide will help you build the project on your local machine. The process will require you to provide a decompressed ROM of the US version of the game.

These steps cover: decompressing the ROM, running the recompiler and finally building the project.

## 1. Clone the BanjoRecomp Repository
This project makes use of submodules so you will need to clone the repository with the `--recurse-submodules` flag.

```bash
git clone --recurse-submodules
# if you forgot to clone with --recurse-submodules
# cd /path/to/cloned/repo && git submodule update --init --recursive
```

## 2. Install Dependencies

### Linux
For Linux the instructions for Ubuntu are provided, but you can find the equivalent packages for your preferred distro.

```bash
# For Ubuntu, simply run:
sudo apt-get install cmake ninja-build libsdl2-dev libgtk-3-dev lld llvm clang
```

### Windows
You will need to install [Visual Studio 2022](https://visualstudio.microsoft.com/downloads/).
In the setup process you'll need to select the following options and tools for installation:
- Desktop development with C++
- C++ Clang Compiler for Windows
- C++ CMake tools for Windows

The other tool necessary will be `make` which can be installe via [Chocolatey](https://chocolatey.org/):
```bash
choco install make
```

## 3. Decompressing the target ROM
You will need to decompress the NTSC-U 1.0 N64 Banjo-Kazooie ROM (sha1: 1fe1632098865f639e22c11b9a81ee8f29c75d7a) before running the recompiler.

The most straightforward way to do this is to set up the [Banjo-Kazooie decompilation](https://gitlab.com/banjo.decomp/banjo-kazooie), which will decompress the ROM when building. Alternatively, you can run the [bk_rom_compressor tool](https://github.com/MittenzHugg/bk_rom_compressor) directly, which is what the decompilation uses to decompress the ROM.

Regardless of which method you use, copy the decompressed ROM to the root of the BanjoRecomp repository with this filename:
- `banjo.us.v10.decompressed.z64`

## 4. Generating the C code

Now that you have the required files, you must build [N64Recomp](https://github.com/N64Recomp/N64Recomp) and run it to generate the C code to be compiled. The building instructions can be found [here](https://github.com/N64Recomp/N64Recomp?tab=readme-ov-file#building). That will build the executables: `N64Recomp` and `RSPRecomp` which you should copy to the root of the BanjoRecomp repository.

After that, go back to the repository root, and run the following commands:
```bash
./N64Recomp banjo.us.rev0.toml
./RSPRecomp n_aspMain.us.rev0.toml
```

## 5. Building the Project

Finally, you can build the project! :rocket:

On Windows, you can open the repository folder with Visual Studio, and you'll be able to `[build / run / debug]` the project from there.

If you prefer the command line or you're on a Unix platform you can build the project using CMake:

```bash
cmake -S . -B build-cmake -DCMAKE_CXX_COMPILER=clang++ -DCMAKE_C_COMPILER=clang -G Ninja -DCMAKE_BUILD_TYPE=Release # or Debug if you want to debug
cmake --build build-cmake --target BanjoRecompiled -j$(nproc) --config Release # or Debug
```

## 6. Success

Voilà! You should now have a `BanjoRecompiled` executable in the build directory! If you used Visual Studio this will be `out/build/x64-[Configuration]` and if you used the provided CMake commands then this will be `build-cmake`. You will need to run the executable out of the root folder of this project or copy the assets folder to the build folder to run it.

> [!IMPORTANT]
> In the game itself, you should be using a standard ROM, not the decompressed one.

## The web page

This fork's `main` branch also builds with [Emscripten](https://emscripten.org) into a page, `BanjoRecompiled.html`,
that draws through WebGPU. `lib/rt64`, `lib/N64ModernRuntime` and `lib/RecompFrontend` are Banjo: Recompiled's own,
at the same upstream commits, and [N64Recomp-browser](https://github.com/amazingalek/N64Recomp-browser) (`lib/N64Recomp-browser`)
patches their checkouts with the web support and makes the game a page. The patches change nothing in the desktop
build. Mods a player adds are off on the page (the live recompiler writes machine code, which a page can't
load), and so is RT64's render to RAM (`src/main/main.cpp` says why).

With steps 1 to 3 done, patch the submodules:

```bash
cmake -P lib/N64Recomp-browser/patches/apply.cmake lib
```

Then step 4, with the `N64Recomp` and `RSPRecomp` built from the patched `lib/N64ModernRuntime/N64Recomp` (the page's
build needs every function the generated code calls declared, and upstream's leaves some out), the Emscripten SDK
installed and activated, and
[naga](https://github.com/gfx-rs/wgpu/tree/trunk/naga) installed (`cargo install naga-cli`):

```bash
embuilder build sdl2-mt freetype-legacysjlj      # once
emcmake cmake -S . -B build-web -G Ninja -DCMAKE_BUILD_TYPE=Release -DRT64_NAGA_EXECUTABLE=<naga> \
    -DPATCHES_C_COMPILER=<clang with a MIPS target> -DPATCHES_LD=<ld.lld>
cmake --build build-web --target BanjoRecompiled
```

A first build compiles about 750 files, which took 34 minutes on a 12-core Windows PC. Two things make later
builds shorter:

- [ccache](https://ccache.dev) on `PATH` when you configure. Every compile then goes through it, so a new build dir,
  or another checkout with its build dir in the same place, compiles nothing that was compiled before: a second
  build dir took 8 minutes on the same PC, 4 of them the link. Keep the build dir inside the checkout, as
  `build-web` is: from one outside it, about half the files miss. The cache is per user, so it also serves other
  recomps built on the same forks.
- `-DN64RECOMP_BROWSER_FAST_LINK=ON` when you only want to try something. The last step then takes seconds instead
  of minutes, because it skips Binaryen's optimization of the whole program. Leave it off for a page that people play.

`build-web` then holds `BanjoRecompiled.html`, `.js`, `.wasm`, `.data` and `coi_serviceworker.js`. The page needs a
browser with WebGPU (Chrome or Edge 113 and up) and must be cross-origin isolated: serve the folder with
`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, or on a host that can't
set headers, as is, and `coi_serviceworker.js` sets them after one reload. The player picks their ROM in the launcher;
it, the settings and the saves are kept in the browser's IndexedDB for that origin.

The page builds the game's shaders from `src/rt64_shaders.txt`, whose 186 are 111 pipelines. In Chrome they are
built behind the game from its first frame, and the game waits only when a frame wants 4 or more that aren't built yet,
under a small "Preparing graphics" indicator in a corner (shown only after a second); Chrome keeps them for the visits
after. Firefox builds a pipeline in line with the rest of its GPU work, so there the game waits on its first frame until
all of them are built. Without them RT64 would draw with its ubershader
meanwhile, which integrated graphics can't keep up with. The build specializes each one (`RT64_PREBUILT_SHADER_LIST`
in `CMakeLists.txt`) and runs it through `spirv-opt` when that is on `PATH`; the list's header says how it was recorded
and what was played. The list has no sections. A shader it missed is built
behind the game, which draws with the ubershader until it is ready, and the page remembers it and builds it with the
rest on the next visit.

On a laptop's Intel UHD (Tiger Lake, 2026-10-13, built from the web forks before the page moved to Banjo's own
submodules) the page played smoothly in Chrome and almost so in Firefox: Firefox's frames came every 31 ms at the
median, but 92 in two minutes took over 50 ms (Chrome's 3), its p99 62 ms against 32, with the Intel chip 79-89% busy
against Chrome's 40-61%. The game reads no frame back and draws nothing with the ubershader there; it issues up to
~600 draws a frame. It runs at 20-30 frames a second, interpolated to the display's rate. On an RTX 2070 with a heavy
pass added to every present to make it fall behind, 4-25 game frames in every 5 s were never shown and the rest one
to three times, in both browsers, until rt64-web e8e162e paced them evenly; then every frame was shown once.

Played from the published page (main 8374e3c, N64Recomp-browser 7b80155) on 2026-10-14 (RTX 2070, an idle host), by
`tools/play_plan.json` with N64Recomp-browser's `tools/play_page.mjs` (`node play_page.mjs chrome|firefox
https://amazingalek.github.io/BanjoRecomp-web/index.html <rom> tools/play_plan.json`, its header says more): the
launcher, Load ROM and the intro, with sound and no WebGPU errors. On a first visit a local build of the same commit
in headless Chrome 155 waited 1.4 s for 12 shaders at the start and then drew 55-56 frames a second. Firefox 158
waited 5.4 s for all 111 (8.4 s on v0.28.0) and then drew 60-61. On a 3840x2000 canvas, the stand-in for integrated
graphics, Chrome drew 22-56 and Firefox 14-61, unevenly, with rt64 pacing its presents to the game's 30 frames a
second for 10 s after the wait.