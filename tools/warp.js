// Evaluated in the page by N64Recomp-browser's tools/play_page.mjs (tools/play_plan.json), to take the game to a map by
// code, without anyone playing. It needs no change to the game: a map change is a request the game's own code leaves in
// the struct at 0x8037E8E0 (transitionToMap in the decomp's core2/code_5C870.c), and its main loop acts on it once no
// fade is running (func_802E4424). This leaves the same request: +0x15 the map, +0x16 the exit, +0x17 a fade in once
// the map is loaded, +0x18 and +0x19 cleared, then +0x14, the transition, set to 1 (a load into normal play). The game
// does the same when Start skips a new game's opening (cutscenetrigger_check: Spiral Mountain, exit 0x12), which it
// allows only once some save file isn't empty. warp(map, exit) resolves once the map (the word at 0x803835D4, map_get)
// is the one asked for, or with false after 30 s; map() gives it, and waitMap(id, ms) waits for one. n64r and n64w are
// page_driver.mjs's RDRAM words, big-endian, so +0x14 is the top byte of the word at +0x14.
(() => {
  const REQUEST = 0x8037E8F4;
  const CURRENT = 0x803835D4;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  window.map = () => n64r(CURRENT);
  window.waitMap = async (id, ms = 120000) => {
    for (let t = 0; t < ms; t += 100) { if (n64r(CURRENT) === id) return true; await sleep(100); }
    return false;
  };
  window.warp = async (id, exit = 0) => {
    n64w(REQUEST + 4, n64r(REQUEST + 4) & 0xFFFF);
    n64w(REQUEST, (1 << 24) | (id << 16) | (exit << 8) | 1);
    return window.waitMap(id, 30000);
  };
  return true;
})()
