/* Carrier Shop ambient ship interior — user-supplied recording. */
(() => {
  "use strict";
  const FILE = "./freesound_community-spaceship-ambient-27988.mp3";
  const audio = new Audio(FILE);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.28;
  audio.setAttribute("aria-hidden", "true");
  let enabled = true;
  let resumeOnGesture = true;

  const play = () => {
    if (!enabled || document.hidden) return;
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.then(() => { resumeOnGesture = false; }).catch(() => {
        // Mobile browsers may require a user gesture before sound starts.
        resumeOnGesture = true;
      });
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audio.pause();
    else play();
  });
  window.addEventListener("pagehide", () => {
    enabled = false;
    audio.pause();
    audio.currentTime = 0;
  });
  window.addEventListener("pageshow", () => {
    enabled = true;
    play();
  });
  for (const eventName of ["pointerdown", "touchend", "keydown"]) {
    document.addEventListener(eventName, () => {
      if (resumeOnGesture && audio.paused) play();
    }, { passive: true });
  }
  audio.addEventListener("error", () => {
    resumeOnGesture = false;
    console.warn("Carrier Shop ambience asset is unavailable:", FILE);
  });
  play();
})();
