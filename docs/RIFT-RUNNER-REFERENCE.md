# Rift Runner: game and naming reference

Baseline: **V244**. Update this file with changes to player-facing names, established rules, or feature status. Use the game and its tests to resolve discrepancies; this guide is a reference, not a second set of game rules.

[Features](#features) · [Story Mode](#story-mode)

## Features

Rift Runner is a carrier-based space fighter game. The core loop is **fit a fighter → launch → fly and fight → dock → repair and refit**. Prioritize that loop even without a briefing. Keep existing missions as playtests and regression cases; new story orders come after the core loop feels right. The Galaxy Map, crew rooms, and ship concepts serve that loop; they do not replace it.

The main menu leads to **Deck Map** and **Hangar**. Deck Map puts **Hangar** first for fitting and flight selection, with **Shop**, **Bridge**, and **Crew Quarters** under **Explore Ship Interior**. **Galaxy Map** and the existing **Flight Shortcuts** are still available. Sorties use the same player flight simulation and equipment rules; the encounter, rewards, and damage persistence depend on the selected mode.

### Flight, inputs, and fitting

- **Touch:** hold the centre of the left pad for main thrust; use the surrounding eight directions to trim movement. Drag the right pad to aim independently; it never fires. Use **FIRE**, the weapon controls, and the pause icon.
- **Keyboard/mouse:** WASD for trim, E for main thrust, arrows or mouse for aim, Space or click to fire, 1/2 to select a weapon, Shift+1/2 for fire mode, Escape/P to pause.
- Main thrust pushes along the nose. Turning while coasting does not change the direction of drift. Side/reverse trim is weaker, especially at speed. Heavier equipment affects acceleration, braking, and top speed.
- Tap a weapon control once to select it; double-tap to toggle Single/Burst if supported. **AK77** is always in Burst. The **Surge-7** engine adds a short boost with resource cost and cooldown.
- The Hangar manages per-fighter loadouts and hull condition. An **engine**, **power generator**, **reserve cell**, and a compatible weapon are required to launch. Rift-4 needs its Size 3 primary weapon; Bastion-9 and Stocky can fly with a Sparrow fitted to either wing. A second gun and a shield are optional. The **Repair hull** action is free. The Hangar also supports visual inspection, canopy movement, and **Inspect Vandul** without changing your fit.
- **He3** is the ship's power resource. The generator replenishes it, the reserve cell stores it, and energy weapons, active shields, and boost draw on it. **Aegis S-3** absorbs up to 5 damage, lasts up to 5 seconds, draws 3 He3 per active second, and has a 10-second cooldown. It is not extra hull HP.
- Settings include sound, aiming assistance, and motion effects; sound may require the first game interaction. The optional iPhone Home Screen install still needs internet and does not make the game offline.

#### Playable fighters and opponents

| Canonical name | Hull HP | Role and fittings |
| --- | ---: | --- |
| **Rift-4 Fighter** | 20 | The Pegasus story starter; uses Size 3 weapon mounts and a nose gun. **Rift-4** is the short form. |
| **Stocky Light Fighter** | 26 | Heavier, sturdier Size 2 wing-mount fighter; **325 credits**. Comes with two Sparrow S2 lasers fitted; other modules are separate. |
| **Bastion-9 Fleet Fighter** | 16 | Lighter, agile twin-boom **Size 2** wing-mount fighter; **475 credits**. Comes with two Sparrow S2 lasers fitted; other modules are separate. **Bastion-9** is the short form. |
| **Vandul fighter** | 20 | AI opponent, not a player-owned hull. Its **Vandul Twinbeam** fires paired laser pulses. |

The two stock Sparrows belong to their hull's fit; they are not extra separately purchased inventory. Existing custom fits are preserved, paid spares stay owned, and Mara still sells individual Sparrow copies for **65 credits each**. Each shot deals **2 damage** and costs **0.5 He3** per gun. The ship shows one aim marker per fitted wing gun; both fitted guns fire, so a full two-gun Burst is 12 shots. **Custom Mode → Test Fly** provides a loaner fit without requiring a purchase or editing the career save. It has an optional **Target range**. A destroyed target returns after **five seconds of active flight**; pausing does not count.

#### Mara's Shop equipment

| Category | Canonical names |
| --- | --- |
| Engines | **Stock thruster**, **Test thruster**, **Surge-7 thruster** |
| Generators | **Weifer He3 Power Generator**, **Weifer He3 Power Generator Mk II**, **Weifer He3 Power Generator Mk III** |
| Reserve cells | **Kestrel H20 He3 Power Storage Cell**, **Kestrel H30 He3 Power Storage Cell** |
| Size 2 weapon | **Sparrow S2 Gimbal Laser**; **Sparrow S2** for the short label. One shot per pod in Single, six per pod in Burst. |
| Size 3 weapons | **Sterling C.32 Laser**, **A-Alkine Ballistic Repeater**, **AK77 Gatling Ballistic**. Sterling is the standard laser; A-Alkine supports hold-to-repeat in normal mode; AK77 fires an 18-round burst. |
| Shield | **Aegis S-3 Shield Generator** |

The **Shop** is the illustrated outfitting bay, not the fitter. Talk to **Mara Venn**, open the appropriate catalog, buy equipment with Pilot credits, then fit it in the Hangar. The Shop protects credits still needed to acquire the required starter modules. New careers begin with **250 credits**. Reward-eligible victories earn **20 credits**; eligible enemy kills add **2.5 credits** and count toward career milestones. Pilot credits are in-game only. The career, inventory, fit and hull condition are browser-local, not a shared account or online economy.

### Galaxy Map, docking, and interface

- The **Galaxy Map** shows the **Outer Reach** and **Uncharted Frontier**. Pan or pinch to explore, tap a contact or use **Find a location** to inspect it, and visit a carrier from its details. The **Bifrost** locator and carrier locator centre or jump once; they do not drag your camera continuously. When Pegasus is off-sector, its locator reads **Go to Carrier**. An unavailable feed must not invent a location. In streamed carrier flight, nearby planets and the parallax starfield are scenery, not destinations you can land on.
- **Federal Navy** is the shared military guild of **Pegasus** (Admiral Bishop) and **Bifrost** (Admiral Adaline). The Galaxy Map lists the guild above each vessel's own name and class; selection, commander and movement stay separate. The human nation's formal name is not set.
- **Pegasus and Bifrost** have independent shared routes and separate Admiral portrait markers. **Admiral Bishop's mission alert** on the status strip is a separate control, shown when a briefing is available; it goes to the Pegasus Bridge. Neither portrait marker itself is a mission alert. **Take Helm** changes a local simulation only and cannot steer the shared carrier.
- Deck Map prefers **Top View** and keeps **Exterior** and **Front View** available. Where available, the **Guild Directory** displays vessel identities to guests. Titles in the directory are story metadata, not pilot permissions.
- In a carrier sortie the fighter begins docked. Use **Launch**, then **Request Docking** to find the aft approach. Enter the marker at a suitable relative speed and use **Dock**, or **Queue Dock** to accept when conditions are met. The carrier keeps moving; once latched the fighter follows the deck rigidly. The docked owned-fighter view is labelled **Landing Page**. After storing the fighter, **Enter Hangar** opens the Hangar for the carrier you landed on. The wingmen use forward pads, and the player returns to the rear pads in Capital. Escort formation is not docking: the fighter keeps flying under its own power.
- Carrier, Hangar, and flight each have their own sounds. Docking radio and mission voices provide feedback without replacing on-screen instructions. Reduced motion and visibility changes are handled separately from whether the player has enabled sound.

### Playable modes and training

| Mode | What it does |
| --- | --- |
| **Practice Alone** | Fly with cones, with no opponent or career rewards. |
| **Fight Vandul** | Six-wave combat against ten Vandul fighters. Asteroid cover, cones, enemy flybys, and projectile interactions affect the fight. Career effects depend on the entry point; Bifrost's drill is training. |
| **Wingman vs Vandul** | Separate training exercise with allied fighters and a longer patrol map. No career rewards; destruction can require Hangar repair. Not the same as the **Wingman Qualification**. |
| **Capital (test)** | Free-flight launch and recovery on a moving carrier with wingmen. No credits or saved hull damage. |
| **Escort** | Fly off Orion's formation slot using **Break away**, then use **Rejoin** to return under your own thrust. No career awards or saved damage. |
| **Custom Mode** | Try a loaner fighter, its normal flight controls, and optionally the target range without spending or altering the save. |

### Prototypes and plans

- **Capital (test)**, **Escort**, **Custom Mode**, and training are playable, with the limits listed above. The unlinked six-ship carrier-launch observer is a **non-playable preview**.
- The **Ship Classes** poster in the Common Room defines the current naming and scale convention: **Fighter → Vessel → Corvette → Frigate → Cruiser → Carrier**. Fighters and illustrated Vessel-class craft fit in the internal hangar; Corvette is shown using the external rear deck; Frigate and Cruiser are not carrier-stowed. A Carrier hosts the hangar. **Support** describes a role, not a hull size. **Vessel, Corvette, Frigate, and Cruiser** are concept classes, not player-selectable. The Corvette art's four empty turret slots illustrate possible attachments; they are not live weapons systems.
- Fixed attachments are mounted modules. Temporary relationships, such as docking or relative formation, are not equipment. Internal-hangar lifts and independent exterior berths are deck conventions; do not infer crew-controlled lifts or networked group operations from the tests.
- Guest vessel directory and shared NPC routes are implemented; **online pilot accounts, shared saves, joining, crew management, and player control of shared ships are not**. Admiral is the carrier/capital commander title; Captain is intended for smaller multicrew vessels.
- A carrier services menu for **refuelling and restocking** and additional hull/attachment classes are design directions, not complete economy or multiplayer features.

## Story Mode

Story orders and qualifications are issued on Pegasus. Training is listed separately under [Features](#features).

### Carriers, crew, and places

- **Pegasus**: a **Pegasus-class military carrier** and the home of the story and qualification boards. **Admiral Bishop** is its commander. Older technical references can say **Rift Carrier**; the player-facing name is Pegasus.
- **Bifrost**: a separate **Bifrost-class carrier** with **Admiral Adaline**. Its bridge offers flight training, not duplicate Pegasus story orders or career qualifications.
- **Mara Venn** is the quartermaster in the Shop. **Dockmaster Elias Vale** handles docking radio communications. **Leena** and **Tomas** are the pilots in Wing Rendezvous. **Sera Voss** is the Galley range marshal; **Ivo Chen** is the trainee pilot in the Crew Berths.
- Interior navigation includes **Bridge**, **Shop**, and **Crew Quarters**, with **Crew Berths**, **Common Room**, **Galley**, **Observation Lounge**, **Refuelling Bay**, and the **Formation Deck** interface. A named room is not proof of a transactional service; the Refuelling Bay is also a narrative meeting place.
- **Orion** is the freighter in Escort training. It is not a selectable player fighter.

### Missions and progression

| Briefing | What it does |
| --- | --- |
| **Outfit the Rift-4** | Bishop's starter order: buy the required parts from Mara, fit them in the Hangar, and lodge completion on the Pegasus Bridge. |
| **Vandul Intercept** | Accept an official sortie, clear all six waves, and report back to Bishop. |
| **Qualification** | Thresholds unlock the next briefing in order. The player must complete and lodge the qualification, not just reach the kills milestone. |
| **Wing Rendezvous** | Accept Bishop's briefing, find Leena by the Common Room pinboard and Tomas in the Observation Lounge, have them saddle up, then meet in the Refuelling Bay. The squadron formation interface belongs to this crew loop. |

Career ranks and milestones: **Cadet** (0), **Wingman** (10), **Ace** (25), **Flight Lead** (50), **Veteran** (75), **Vanguard** (150), **Rift Legend** (300). Qualifications occur in sequence.
## Keeping this reference current

Current sources: `fighter-registry.js` (hull names), `pilot-credits.js` (catalog and economy), `pilot-missions.js` (rank gates), `carrier-*.html` (player labels), and `game.js` (flight behavior). In the Site checkout these live under `dist/`. When adding a feature, distinguish **implemented**, **playable test**, and **planned**, and update this reference only after verifying the corresponding behavior.
