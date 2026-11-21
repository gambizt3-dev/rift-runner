# Rift Runner
A one-arena, top-down hovercraft sandbox. Open `index.html` in a modern browser.

- **Touch:** steer with the eight direction buttons at bottom left. FIRE sits above steering: tap to shoot, or hold for repeat with Ballistic. Use the right pad to aim while you steer or fire. Release to keep the current heading; the aim pad never fires. Optional Auto Aim in Settings is off by default; choosing a direction on the right takes over until the next reset or until you re-enable Auto Aim.
- **Steering:** the ship keeps its momentum when you release the controls. Steer against the drift to brake or reverse.
- **Desktop:** WASD flies; arrows or mouse aim; press Space or click once per shot. Hold Space with Ballistic to repeat. Escape/P pauses.
- **Sound and shake:** open **Settings**. Audio starts when you launch a run. Switch between **Blaster** and **Ballistic** on the arena edge (or 1/2 while flying with a keyboard). Use **Test shot** in Settings to hear the current gun. The Blaster has a straight normal shot and a tight six-shot laser burst. Ballistic has more recoil, cone push and spread in both modes. Double-tap the weapon button to toggle Burst, or use Shift+1/2. Reduced-motion settings default shake off.

The hovercraft and cones physically collide. Drive into cones to push them, or hit them with the blaster to send them sliding and spinning. The apron is a sandbox: no opponents, extra stages, or upgrades. Local settings carry over.

## Fighter loadout
The primary weapon mount equips a stable ID from the weapon profile registry in `dist/game.js` (in `game.js` in the public repository). Each profile controls fire style, recoil, knockback, spread and projectile appearance. Changing the weapon does not alter the stock thruster or reserved utility slot. The fitting menu, extra modules and extra weapon choices are not part of this build.

## Cannon audio
The in-game cannon uses a short mix of [Game Blaster Shot by Universfield](https://pixabay.com/sound-effects/film-special-effects-game-blaster-shot-635112/) under the [Pixabay Content License](https://pixabay.com/service/license-summary/), trimmed, retimed, filtered and layered with an original bass recoil. The project bundles the gameplay mix, not the original download. Ballistic uses the user-supplied Shoot 6 recording from freesound_community, trimmed, filtered and faded for repeat fire. The unedited recording is not included.

During flight, Blaster projectiles have a quiet energy hum and Ballistic projectiles give a brief zip. These are synthesized separately from the firing sounds; Sound controls both.

## iPhone Home Screen
Open the deployed HTTPS game in Safari, use Share → Add to Home Screen, and enable Open as Web App if shown. This is optional; the normal browser version still works. The installed shortcut needs an internet connection and the same site access as Safari. No private page or sign-in data is cached for offline play.

## Thruster audio
Use **Test engine** to hear the synthesized attack, sustain and fade independently of **Test shot**. In the Hangar, tap **Test engine** for a short flare, or hold to build thrust and release to fade. This test never moves the fighter; it follows the Sound and Shake settings. Movement input drives the engine; coasting does not. Turn Sound on and start the game or tap a test button to unlock browser audio.

If you leave the game or lock your iPhone, audio restarts on your next tap after returning. Use **Resume flight** to continue, or either test button to check sound. Your Sound setting does not change.

On supported phones, **Silent Mode audio** explicitly opts into media playback and may pause other media. **Test phone audio** plays the selected shot clip through the browser media player, separately from the normal game audio. The game Sound switch still applies; audio stops when you leave the page. A successful browser test can’t confirm what came out of the phone speaker.

## Hangar
Use **Hangar** to see the stock fighter and choose its primary and optional secondary weapon. Mounting a weapon already on the other occupied slot swaps them. An unmounted weapon disappears from the arena rack. Keyboard 1/2 selects primary/secondary. The stock thruster and power core stay fixed; shield and countermeasure slots are empty for future gear. Empty optional slots do not block flight. The fit is saved on this browser.

The Arena and Hangar use the same user-approved, north-facing fighter artwork. The bundled transparent PNG is losslessly encoded from a game-size resample; physics, the craft shadow, and muzzle gameplay are unchanged.

The Hangar shows the same fighter parked on a separate overhead bay floor, with the live loadout controls below it on phones. The arena floor and flight behavior are unchanged.

Tap the canopy in the Hangar to lift and slide the complete metal shell, both pointed feet and its glass aft together, revealing the empty cockpit. Steam vents at both seams during lift, then the lid pauses briefly before sliding aft. Tap the canopy area again to close it. Keyboard activation works, and reduced motion skips the transitions. The arena is unchanged.
