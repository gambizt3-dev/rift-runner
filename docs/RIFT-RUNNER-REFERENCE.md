# Rift Runner: game and naming reference

Baseline: **V259**. Update this file with changes to player-facing names, established rules, or feature status. Use the game and its tests to resolve discrepancies; this guide is a reference, not a second set of game rules.

[Features](#features) · [Story Mode](#story-mode)

## Features

Rift Runner is a carrier-based space fighter game. The core loop is **fit a fighter → launch → fly and fight → dock → repair and refit**. Prioritize that loop even without a briefing. Keep existing missions as playtests and regression cases; new story orders come after the core loop feels right. The Galaxy Map, crew rooms, and ship concepts serve that loop; they do not replace it.

The main menu leads to **Deck Map** and **Hangar**. Deck Map puts **Hangar** first for fitting and flight selection, with **Shop**, **Bridge**, and **Crew Quarters** under **Explore Ship Interior**. **Galaxy Map** is a separate Deck Map destination. On the carrier where your fighter is parked, open **Hangar → Board Fighter → Add flight mode** to plan a sortie; the Deck Map no longer duplicates that list. An owned fighter starts parked in **Personal Fighter Bay 01** at your home carrier unless it has a saved berth elsewhere. The Hangar shows only owned fighters parked on that carrier. Browsing another carrier from the Galaxy Map does not change a fighter’s berth. **Test a loaner fighter** is available in Custom Mode without ownership. Leave the itinerary empty for Free Flight. The flight deck still requires a manual **Launch**. Sorties use the same player flight simulation and equipment rules; the encounter, rewards, and damage persistence depend on the selected mode.

### Flight, inputs, and fitting

- **Touch:** hold the centre of the left pad for main thrust; use the surrounding eight directions to trim movement. Drag the right pad to aim independently; it never fires. Use **FIRE**, the weapon controls, and the pause icon.
- **Keyboard/mouse:** WASD for trim, E for main thrust, arrows or mouse for aim, Space or click to fire, 1/2 to select a weapon, Shift+1/2 for fire mode, Escape/P to pause.
- Main thrust pushes along the nose. Turning while coasting does not change the direction of drift. Side/reverse trim is weaker, especially at speed. Heavier equipment affects acceleration, braking, and top speed.
- Tap a weapon control once to select it; double-tap to toggle Single/Burst if supported. **AK77** is always in Burst. The **Surge-7** engine adds a short boost with resource cost and cooldown.
- The Hangar manages the loadout and hull condition of each fighter parked there. Without a saved berth for a fighter, its default is the pilot’s assigned carrier; old and unaffiliated saves default to Pegasus. Visiting or storing a fighter aboard another carrier does not change the pilot’s carrier assignment or guild membership. An **engine**, **power generator**, **reserve cell**, and a compatible weapon are required to launch. Rift-4 needs its Size 3 primary weapon; Bastion-9 and Stocky can fly with a Sparrow fitted to either wing. A second gun and a shield are optional. The **Repair hull** action is free: a surviving damaged fighter takes **30 seconds**; a destroyed fighter takes **4 minutes** to rebuild. Saved hull HP is per fighter and is not restored by returning to the carrier. The Hangar also supports visual inspection, canopy movement, and **Inspect Vandul** without changing your fit.
- **He3** is the ship's power resource. The generator replenishes it, the reserve cell stores it, and energy weapons, active shields, and boost draw on it. **Aegis S-3** absorbs up to 5 damage, lasts up to 5 seconds, draws 3 He3 per active second, and has a 10-second cooldown. It is not extra hull HP.
- Settings include sound, aiming assistance, and motion effects; sound may require the first game interaction. The optional iPhone Home Screen install still needs internet and does not make the game offline.

#### Playable fighters and opponents

| Canonical name | Hull HP | Role and fittings |
| --- | ---: | --- |
| **Rift-4 Fighter** | 20 | The Pegasus story starter; uses Size 3 weapon mounts and a nose gun. **Rift-4** is the short form. |
| **Stocky Light Fighter** | 26 | Heavier, sturdier Size 2 wing-mount fighter; **325 credits**. Comes with two Sparrow S2 lasers fitted; other modules are separate. |
| **Bastion-9 Fleet Fighter** | 16 | Lighter, agile twin-boom **Size 2** wing-mount fighter; **475 credits**. Comes with two Sparrow S2 lasers fitted; other modules are separate. **Bastion-9** is the short form. |
| **Vandul fighter** | 20 | AI opponent, not a player-owned hull. Its **Vandul Twinbeam** fires paired laser pulses. |

The two stock Sparrows belong to their hull's fit; they are not extra separately purchased inventory. Existing custom fits are preserved, paid spares stay owned, and Mara still sells individual Sparrow copies for **65 credits each**. Each shot deals **2 damage** and costs **0.5 He3** per gun. The ship shows one aim marker per fitted wing gun; both fitted guns fire, so a full two-gun Burst is 12 shots. **Custom Mode** in the cockpit and **Test Fly** in Mara’s Shop provide a loaner fit without requiring a purchase or editing the career save. It has an optional **Target range**. A destroyed target returns after **five seconds of active flight**; pausing does not count.

#### Mara's Shop equipment

| Category | Canonical names |
| --- | --- |
| Engines | **Stock thruster**, **Test thruster**, **Surge-7 thruster** |
| Generators | **Weifer He3 Power Generator**, **Weifer He3 Power Generator Mk II**, **Weifer He3 Power Generator Mk III** |
| Reserve cells | **Kestrel H20 He3 Power Storage Cell**, **Kestrel H30 He3 Power Storage Cell** |
| Size 2 weapon | **Sparrow S2 Gimbal Laser**; **Sparrow S2** for the short label. One shot per pod in Single, six per pod in Burst. |
| Size 3 weapons | **Sterling C.32 Laser**, **A-Alkine Ballistic Repeater**, **AK77 Gatling Ballistic**. Sterling is the standard laser; A-Alkine supports hold-to-repeat in normal mode; AK77 fires an 18-round burst. |
| Shield | **Aegis S-3 Shield Generator** |

The **Shop** is the illustrated outfitting bay, not the fitter. Talk to **Mara Venn**, open the appropriate catalog, buy equipment with Pilot credits, then fit it in the Hangar. The Shop protects credits still needed to acquire the required starter modules. New careers begin with **250 credits**. Reward-eligible victories earn **20 credits**; eligible enemy kills add **2.5 credits** and count toward career milestones. Pilot credits are in-game only. The career, inventory, fit, and hull condition stay in the browser and are not sent with parking updates. Berths are saved on the server under a browser key for that pilot. Locking and reopening the pilot in the same browser restores the berth; this is not a cross-device account or online economy.

### Galaxy Map, docking, and interface

- The **Galaxy Map** shows the **Outer Reach** and **Uncharted Frontier**. Pan or pinch to explore, tap a contact or use **Find a location** to inspect it, and visit a carrier from its details. **My fighter** opens the Deck Map for the active fighter’s saved carrier, regardless of guild assignment or the current map selection. The main menu’s Deck Map follows the same parked carrier; visiting a named carrier explicitly still takes you to that carrier. The **Bifrost** locator and carrier locator centre or jump once; they do not drag your camera continuously. When Pegasus is off-sector, its locator reads **Go to Carrier**. An unavailable feed must not invent a location. In streamed carrier flight, the nearby planet stays fixed and extends beyond the edge of the view while foreground motion continues. The Galaxy Map still determines which planet is nearby; planets and the parallax starfield are scenery, not destinations you can land on.
- **Federal Navy** is the shared military guild of **Pegasus** (Admiral Bishop) and **Bifrost** (Admiral Adaline). The Galaxy Map identifies each vessel with its guild, name and class. Select a vessel to see large, side-by-side ship and admiral images; selection, commander and movement stay separate. The human nation's formal name is not set.
- **Pegasus and Bifrost** have independent shared routes and separate Admiral portrait markers. **Admiral Bishop's mission alert** on the status strip is a separate control, shown when a briefing is available; it goes to the Pegasus Bridge. Neither portrait marker itself is a mission alert. **Take Helm** changes a local simulation only and cannot steer the shared carrier.
- Deck Map prefers **Top View** and keeps **Exterior** and **Front View** available. Where available, the **Guild Directory** displays vessel identities to guests. Titles in the directory are story metadata, not pilot permissions.
- In a carrier sortie the fighter begins docked. Use **Launch**, then **Request Docking** to find the aft approach. Enter the marker at a suitable relative speed and use **Dock**, or **Queue Dock** to accept when conditions are met. The carrier keeps moving; once latched the fighter follows the deck rigidly. The docked owned-fighter view is labelled **Landing Page**. After storing the fighter, **Enter Hangar** opens the Hangar for the carrier you landed on. The wingmen use forward pads, and the player returns to the rear pads in Capital. Escort formation is not docking: the fighter keeps flying under its own power.
- On the **Galaxy Map**, select the other carrier and use **Fly to [carrier]** for the active owned fighter. This stages **owned Free Flight** at the fighter’s current carrier; use **Launch** to take off manually. The fighter then travels to the destination on the chart in a short, three-second test leg and enters that carrier’s **Battle Fleet Map** for the approach. The same fighter, fit, hull condition, fuel, and heat carry through. Request new clearance and dock at the destination, then use **Store Inside**. The fighter’s new berth is saved only when the server confirms it. The server picks an open bay at random from **01, 02, 04, and 06**. Retrying storage at that carrier or reopening the game keeps the assigned bay. The **Galaxy Map** carrier details and the **Hangar** show the same saved berth. Plotting a course, arriving, requesting clearance, docking alone, and browsing another carrier do not create or change a berth. Storing one fighter does not move any other fighter or change the pilot’s home carrier or guild. Custom loaners and other test and combat modes do not save berths.
- If an older save already parked an owned fighter at Bifrost, open **Bifrost → Hangar** in that same browser. The Hangar can import the old berth and receive a bay if the server has no berth for that fighter. Opening the Galaxy Map does not import it.
- If you are already airborne in owned **Free Flight**, open **Galaxy Map** from the flight HUD, select the other carrier, and choose **Fly to [carrier]**. This starts the same chart leg without another launch. Close the map before choosing a destination to resume the same local flight.
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
| **Corsair Cluster · Cross-tile test** | Use your owned fighter. Its carrier’s Galaxy Map approach selects the marked departure edge and matching Battle Map entry. Fly against three patrolling Blackwake-type pirate vessels. Starts from saved hull HP; damage and 30-second docked repair are local to the sortie. |
| **Custom Flight 4-Way Battle** | Choose a north, south, east, or west test carrier. Manually launch one loaner fighter and pass the marked exit into the same test arena, where three independent rivals arrive from the other edges. Last fighter standing wins. No allies, credits, career progress, saved hull damage, or berth changes. |

**Blackwake Cross Battle (Galaxy Map only).** While engaged, Bifrost and Blackwake hold their positions on the chart. For this rollout, the one four-hour authored playtest starts at Bifrost’s first Reach waypoint after 17:50 AEDT on 24 November 2026; after the window, Bifrost resumes its route. Tap the X between them for **Join** or **Watch**. Watch is a read-only local AI preview that does not launch, park, or affect your fighter or require a pilot ship. Select Blackwake to **Intercept Blackwake** from Pegasus’s own live approach. Select Bifrost to **Reinforce Bifrost**: Pegasus follows behind Bifrost in one Battle Fleet Map, and both flights enter the same Blackwake combat tile from Bifrost’s frozen approach. Intercept preserves Bifrost’s separate ingress. Both actions stage a manual launch from Pegasus and require a launch-ready owned fighter with a cloud-confirmed Pegasus berth; if there is no berth yet, fly, dock and choose **Store Inside** aboard Pegasus first. Return from the same entry side to request docking on Pegasus. This uses one shared encounter identity and verifies participation with the server; enemies, wingmen, and damage are simulated on the device. This version does not synchronize combat between players, award career progress, or save training damage or a new berth.

**Carrier Manpower.** Select Pegasus or Bifrost on the Galaxy Map to see its carrier-owned Rift-4s ready in the hangar multiplied by its available NPC pilots. Privately owned fighters and human pilots do not count. A missing stats response shows **Unavailable**, not zero.

**Pirate Hideout (Galaxy Map battle destination).** Find this fixed asteroid outpost in the Outer Reach near the Corsair Cluster; **Find a location** can take you there from any sector. Select a side to enter the same Blackwake Online Battle as the separate Online battle marker. Inspecting the hideout does not launch the sortie or change a vessel’s course; the landmark remains visible when the room is unavailable.

**Blackwake Online Battle (multiplayer exercise).** On the Galaxy Map, select the distinct **Online battle** marker or find **Blackwake · Online battle**. An **X** replaces the ordinary online marker while an NPC-originated round is running. Join that same room if you want to participate. When the server lists the room as joinable, choose **Join as Bifrost ally** or **Join Blackwake’s side** to enter the same public game room. The sides are temporary exercise teams, not guild or faction changes. This is separate from the timed Cross Battle X, its local Watch preview, and the solo Corsair/Custom tests. Both sides require a launch-ready owned fighter and a confirmed berth in the public game. The private Galaxy Map opens the public game; the mirror and public game do not share browser profiles. When a room is running, the full Galaxy Map can show a **Battle** alert once per round in that browser tab. Open it for a written invitation from your home admiral. Choose **Join as ally** to review entry or **Not now** to decline. No alert automatically launches or changes your affiliation.

During either local cross-tile test, a surviving fighter can retreat by reaching its original entry edge and pressing **Return to Battle Fleet Map**. Early retreat ends the test without a result or reward. After winning either cross-tile test, the fighter stays under your control. The **Return to Battle Fleet Map** button and a marker point to your original entry edge. You can fly there yourself and tap the button, or tap it from farther away to let the autopilot fly the fighter to the exit. Return puts you back airborne near the same carrier with your current ship, hull, and fuel. Once docked after returning, **Repair hull** restores hull HP after **30 seconds** in that test without refilling fuel, changing loadout, or saving the test result or berth.

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
- **Mara Venn** is the quartermaster in the Shop. **Dockmaster Elias Vale** gives regular clearance on first contact with each carrier, then can occasionally greet a returning pilot with “Back so soon?” in the same browser tab. **Leena** and **Tomas** are the pilots in Wing Rendezvous. **Sera Voss** is the Galley range marshal; **Ivo Chen** is the trainee pilot in the Crew Berths.
- Interior navigation includes **Bridge**, **Shop**, and **Crew Quarters**, with **Crew Berths**, **Common Room**, **Galley**, **Observation Lounge**, **Refuelling Bay**, and the **Formation Deck** interface. All five crew rooms have ambient crew alongside existing named encounters; the Common Room has a seated crew member on the couch, and the Galley has one in the booth. A named room is not proof of a transactional service; the Refuelling Bay is also a narrative meeting place.
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
