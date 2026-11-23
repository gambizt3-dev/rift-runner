# Rift Runner
A one-arena, top-down hovercraft sandbox. Open `index.html` in a modern browser. The Main Menu opens the Carrier or the Hangar. Launch **Practice Alone** or **Fight Vandul** from the Carrier. In either flight, **Carrier** ends the run and takes you back to the ship. The Hangar is accessible from the Main Menu or from the Carrier, but not during flight. **Carrier** opens a separate view of the fighter’s home ship, with a link back to the Main Menu. Use **Exterior** or **Top View** to change angle through up to seven poses in about one second. **Front View** shows the carrier from above its bow, with the lit bridge window and side intakes visible and the rear nozzle openings hidden. Reduced Motion skips the Exterior/Top transition. Background stars drift slowly toward the stern; nearby space particles occasionally streak past four softly glowing cyan exhaust plumes. Reduced Motion hides the streaks and keeps the plumes static. The bay is shown without a fighter sprite. When you launch **Fight Vandul** from the Carrier, your fighter flies in from beyond the south edge before the enemy countdown begins. Practice, Reset and Reduce Motion skip this arrival. The Carrier’s **Hangar** link opens the same working Hangar without starting a flight. **Back to Carrier** returns to the exterior view. **Engine Sound** tries to play automatically on the visible Carrier page. If a browser blocks it, use an ordinary Carrier view click or tap **Engine Sound**. Turning it off keeps it muted in that browser tab. Sound never plays while the Carrier is hidden or left. The adapted engine loop is based on [Space Flight 11 by bretbernhoft](https://pixabay.com/sound-effects/film-special-effects-space-flight-11-433378/) under the [Pixabay Content License](https://pixabay.com/service/license-summary/).

- **Touch:** steer with the eight direction buttons at bottom left. FIRE sits above steering: tap to shoot, or hold for repeat with the A-Alkine in Normal mode. Use the right pad to aim while you steer or fire. Release to keep the current heading; the aim pad never fires. Optional Auto Aim in Settings is off by default; choosing a direction on the right takes over until the next reset or until you re-enable Auto Aim.
- **Steering:** the ship keeps its momentum when you release the controls. Steer against the drift to brake or reverse.
- **Desktop:** WASD flies; arrows or mouse aim; press Space or click once per shot. Hold Space with the A-Alkine in Normal mode to repeat. Escape/P pauses.
- **Sound and shake:** open **Settings**. Flight audio starts on your first trusted input in the arena. Switch between mounted weapons on the arena edge (or 1/2 while flying with a keyboard). Use **Test shot** in Settings to hear the current gun. Sterling has a straight normal shot and a tight six-shot laser burst. A-Alkine has more recoil, cone push and spread. Double-tap either weapon button to toggle Burst, or use Shift+1/2. The AK77 is always in its own burst mode. Reduced-motion settings default shake off.

The hovercraft and cones physically collide. Drive into cones to push them, or hit them with the blaster to send them sliding and spinning. The apron is a sandbox: no opponents by default, and no extra stages or upgrades. Local settings carry over.

## Vandul duel
Choose **Fight Vandul** on the Carrier to enter the cone arena. After the three-second flight countdown, Vandul fighters fly in from above the arena and engage only once fully inside. Choose **Practice alone** for cones only. It keeps some distance, telegraphs its aim, and shoots lasers at your ship. Sometimes it signals a quick pass to one side before pulling back. Both fighters have 20 hull HP. Vandul fits a 20 HP crescent hull (65 weight), a maneuvering drive (20), a power core (8) and one pulse laser (7), with no shield or secondary weapon. Its total weight of 100 governs acceleration and how much hits move it, separately from the drive’s top speeds. Its laser deals 2 HP and nudges what it hits. Cones and heavy asteroids can block shots. Player and Vandul projectiles also cancel one another, one for one, with a brief burst of sparks. Shots from the same side pass through each other. Your ballistic hits each widen its laser spread by 1° for half a second of active flight; the stacks expire separately. Waves 1–3 have one Vandul each, waves 4–5 have two, and the final wave (6) has three. Each wave has one three-second countdown, then ships enter from clear lanes one after another. Destroy every fighter in the wave to start the next; your hull and the field are not reset or repaired. Defeat all ten across six waves to complete the mission. Your fighter then leaves the arena for the Carrier; Reduced Motion keeps the banner but skips the fly-out. If the Carrier does not open automatically, use **Back to Carrier**. The HUD tracks remaining enemies, waves, kills and each ship’s hull. Wrecks stay until **Reset**: the newest three still drift and collide, while older wrecks are drawn into a persistent background layer. If that layer is unavailable, up to 64 older wrecks stay visible and the HUD notes when that limit is reached. Use **Reset** for a fresh run from wave 1, or return to the Carrier and choose **Practice Alone** for the regular cone sandbox. **Asteroid cover** is on by default in the duel. Each duel rolls 3–7 movable asteroids of different sizes, including a larger rock, plus a few smaller pieces of scrap. Both sides’ shots can be blocked, and cover nudges or gently turns on impact. Lasers barely move them; ballistic hits nudge them farther. Switch cover off for a clean aiming test.

The camera uses the entire arena canvas, showing more of the world when the display aspect ratio allows it without stretching the fighter.

## Fighter loadout
Each loadout slot references a stable module ID. Weapon profiles own damage, recoil, knockback, spread, fire mode, and projectile appearance. The engine supplies the rated forward speed and thrust. Fitted hull, weapons, engine, generator, battery, and shield contribute to flight mass. Heavier fits accelerate, reverse and brake more slowly, reduce fitted forward top speed, and absorb recoil and contact impulses with less change in velocity. The unchanged baseline is the standard stock two-weapon fit without a shield. Flight is fastest toward the fighter’s nose, with 78% side thrust speed and 72% reverse speed; diagonal speeds blend smoothly. Steering and aiming remain independent.

## Cannon audio
The in-game cannon uses a short mix of [Game Blaster Shot by Universfield](https://pixabay.com/sound-effects/film-special-effects-game-blaster-shot-635112/) under the [Pixabay Content License](https://pixabay.com/service/license-summary/), trimmed, retimed, filtered and layered with an original bass recoil. The project bundles the gameplay mix, not the original download. Ballistic uses the user-supplied Shoot 6 recording from freesound_community, trimmed, filtered and faded for repeat fire. The unedited recording is not included.

Ballistic Burst keeps all six original shot sounds and adds one quieter, delayed layer under the volley, with a tail that rings out after the sixth shot. The new layer is a short cropped, filtered, faded game adaptation of [Loud Space Launch by IdoBerg](https://pixabay.com/sound-effects/film-special-effects-loud-space-launch-351055/) under the [Pixabay Content License](https://pixabay.com/service/license-summary/). It is not played for single shots, normal hold-to-repeat, or Blaster Burst.

During flight, Blaster projectiles have a quiet energy hum and Ballistic projectiles give a brief zip. These are synthesized separately from the firing sounds; Sound controls both.

## Arena music
Background 1 loops quietly during active flight, ducks under shots, and follows the Sound switch. It is silent in the Hangar, when paused, and when the game is hidden. The bundled game mix of [Space Chords Loop by IdoBerg](https://pixabay.com/sound-effects/musical-space-chords-loop-310493/) uses a filtered stereo mix and a crossfaded loop under the [Pixabay Content License](https://pixabay.com/service/license-summary/).

## iPhone Home Screen
Open the deployed HTTPS game in Safari, use Share → Add to Home Screen, and enable Open as Web App if shown. This is optional; the normal browser version still works. The installed shortcut needs an internet connection and the same site access as Safari. No private page or sign-in data is cached for offline play.

## Thruster audio
Hold a movement control or **Test engine** to hear the stock thruster. Release to fade; coasting does not drive the engine. The Hangar test builds the flare with the hold and never moves the fighter. The recording is a filtered, crossfaded adaptation of [Large Rocket Engine by Zovex](https://freesound.org/people/Zovex/sounds/237974/) (CC0), from Andy's matching Pixabay MP3. If the clip isn't loaded or cannot be decoded, the generated thruster is used. The engine has its own volume gain, independent of weapons and arena music.

If you leave the game or lock your iPhone, audio restarts on your next tap after returning. Use **Resume flight** to continue, or either test button to check sound. Your Sound setting does not change.

On supported phones, **Silent Mode audio** explicitly opts into media playback and may pause other media. **Test phone audio** plays the selected shot clip through the browser media player, separately from the normal game audio. The game Sound switch still applies; audio stops when you leave the page. A successful browser test can’t confirm what came out of the phone speaker.

## Hangar
Use **Hangar** to see the stock fighter and choose its engine, primary weapon, and optional secondary weapon. Mounting a weapon already on the other occupied slot swaps them. An unmounted weapon disappears from the arena rack. Keyboard 1/2 selects primary/secondary. The power core stays fixed; shield and countermeasure slots are empty for future gear. Empty optional slots do not block flight. The fit is saved on this browser.

The Arena and Hangar use the same user-approved, north-facing fighter artwork. The bundled transparent PNG is losslessly encoded from a game-size resample; physics, the craft shadow, and muzzle gameplay are unchanged.

The Hangar shows the same fighter parked on a separate overhead bay floor, with the live loadout controls below it on phones. The arena floor and flight behavior are unchanged.

Tap the canopy in the Hangar to lift and slide the complete metal shell, both pointed feet and its glass aft together, revealing the empty cockpit. Steam vents at both seams during lift, then the lid pauses briefly before sliding aft. Tap the canopy area again to close it. Keyboard activation works, and reduced motion skips the transitions. The arena is unchanged.

### Stock fighter stats
The Winged Fighter starts and resets with 20 hull HP. Its stock thruster is speed rating 10 (the same 222 arena units per second under thrust). Sterling C.32 Laser carries 3 damage per projectile and A-Alkine Ballistic Repeater carries 5, in every fire mode. Hard, head-on wall impacts reduce hull HP. The cones move when hit but do not take damage; the fighter has no shield.

The Hangar's Engine selector swaps between the stock thruster (speed rating 10; 222 arena units per second) and the test thruster (rating 1; 22.2 units per second). The two engines use the same weight and acceleration settings so the top-speed difference stands out. Only the stock thruster uses the recorded rocket loop; the test thruster uses the generated sound.

### AK77 Gatling Ballistic
The AK77 is available in either weapon slot and is not fitted by default. One FIRE press sends 12 rounds, then the gun cools down for 1.15 seconds after the last round. There is no single-shot or hold-to-repeat mode. It is a heavier option with 2 damage per projectile.

Sterling and A-Alkine push their own fighter back less than in the previous build. The damage, spread, visual kick and knockback applied to cones are unchanged.

Target push is independent from the recoil on the fighter. Per projectile, AK77 has light push, Sterling medium, and A-Alkine heavy. The Hangar lists the push class for each mounted weapon.

In the Hangar, use **Inspect Vandul** to see the enemy art and real combat loadout. The view is read-only and keeps your own fitting intact.

Vandul attempts more frequent flybys: the first is due after 2–3.35 seconds of active combat. It can use a safe flyby to reposition when asteroids block its line to the player. Warnings, recovery, and route checks remain in place.

The arena world is 960 × 1440 units. The original 480 × 720 viewport follows the fighter and stops at the outer walls, preserving ship size and touch controls.

The Carrier displays **Pilot credits** stored in this browser. Completing all six Vandul waves earns **20 credits**; Practice and incomplete runs earn none. The balance is not shared across devices and cannot be spent yet.

**Shop** on the Carrier opens a static illustrated open outfitting bay for full-size fighter engines, ship weapon modules and shield generators. Talk to Mara Venn, the local quartermaster, about engines, ship weapons, or shield generators. The catalog illustrates the two current fighter engines and three current weapons, with their in-game stats. The deck shows the same local Pilot credits balance, but no stock is listed and no spending is enabled.
