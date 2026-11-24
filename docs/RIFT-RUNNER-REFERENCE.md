# Rift Runner: game and naming reference

Last verified: **24 November 2026**, against public gameplay revision `b351787`. This is the current implementation and naming reference. [Core Gameplay Structure](CORE-GAMEPLAY-STRUCTURE.md) and [Guild and Vessel Identity](GUILD-VESSEL-IDENTITY.md) preserve the design intent. If a design note and this inventory disagree, check the game and its tests before making a change.

[Features](#features) · [Story Mode](#story-mode)

## Features

**Status labels:** **Live** means available in the public build. **Playable test** means available with mode-specific save and reward limits. **Preview** means inspectable, not a playable or persistent system. **Planned** means it is not implemented.

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

The **Battle Fleet Map** is local space around the moving carrier, used for formation, launch and recovery. The **Battle Map** is the selected encounter. The **Galaxy Map** is the strategic travel layer. The normal flow is **Board Fighter → choose an itinerary or leave it blank → manual Launch → fly through the marked exit for the selected objective**. Launching alone does not enter combat; ordinary camera edges do not trigger missions.


| Mode | What it does |
| --- | --- |
| **Free Flight** | Leave the itinerary empty for local flight around the moving carrier. Dock and store, or use the airborne Galaxy Map to begin an owned-fighter transfer. No combat objective starts by itself. |
| **Practice Alone** | Fly with cones, with no opponent or career rewards. |
| **Fight Vandul** | Six-wave combat against ten Vandul fighters. Asteroid cover, cones, enemy flybys, and projectile interactions affect the fight. Career effects depend on the entry point; Bifrost's drill is training. |
| **Wingman vs Vandul** | Separate training exercise with allied fighters and a longer patrol map. No career rewards; destruction can require Hangar repair. Not the same as the **Wingman Qualification**. |
| **Capital (test)** | Free-flight launch and recovery on a moving carrier with wingmen. No credits or saved hull damage. |
| **Escort** | Fly off Orion's formation slot using **Break away**, then use **Rejoin** to return under your own thrust. No career awards or saved damage. |
| **Custom Mode** | Try a loaner fighter, its normal flight controls, and optionally the target range without spending or altering the save. |
| **Corsair Cluster · Cross-tile test** | Use your owned fighter. Its carrier’s Galaxy Map approach selects the marked departure edge and matching Battle Map entry. Fly against three patrolling Blackwake-type pirate vessels. Starts from saved hull HP; damage and 30-second docked repair are local to the sortie. |
| **Custom Flight 4-Way Battle** | Choose a north, south, east, or west test carrier. Manually launch one loaner fighter and pass the marked exit into the same test arena, where three independent rivals arrive from the other edges. Last fighter standing wins. No allies, credits, career progress, saved hull damage, or berth changes. |

**Historical Blackwake Cross Battle trial.** The timed Bifrost–Blackwake encounter used a frozen Galaxy Map X with local Intercept, Reinforce and Watch choices. Reinforcing put Pegasus behind Bifrost in the same fleet tile; interception kept a separate ingress. Its November 24 rollout window has ended. Do not confuse it with the current shared Blackwake room or local Corsair test.

### Carrier manifest and Armada

- **Live · Inside the carrier** on each Deck Map lists only what is stored inside that carrier, separating Navy reserves from player-owned stored fighters. It shows ready NPC pilots and players with confirmed stored fighters, not live player presence. Deployed ships are not inside. Initial reserves per carrier: **20 Rift-4s, 4 Bastion-9s, 4 Stocky Light Fighters, 15 NPC pilot slots, and 100 supply units**. These are starting figures, not guaranteed current stock or a spendable supply loop.
- **Live · Armada roster** uses one moving marker for each formation and one gold star per additional multicrew vessel. Pegasus currently has one escort, **Resolute**, under **Captain Imani Rook**. **Resolute** is the individual vessel name, **Keel-12** is the hull model, and **Corvette** is the ship type. Bifrost travels independently. The left-hand roster thumbnails stay the same size and tap to expand; they do not represent relative physical scale. Use detailed art in flight and compact thumbnails in lists. Show the same ship and fitted modules in both; an attachment never gets its own fleet row, star, or marker. Joining and detaching under player command are planned, not available controls.
- **Live · Armada Manpower** is separate from formation size. The current estimate is **stored carrier reserve weapon power × ready NPC pilots**. It counts the verified standard volley of each available reserve hull: Rift-4 = 2, Bastion-9 = 4, Stocky = 4. Full starting stock gives `(20 × 2 + 4 × 4 + 4 × 4) × 15 = 1,080` per carrier. This figure can change with readiness and losses, and can match across different formations. The verified estimate excludes escort armament, live human readiness and player-owned fitted weapons; the target metric can include human availability and player fits once verified. The star shows fleet membership, not weapon power or the admiral's rank.

### Blackwake encounters

**Pirate Hideout (Galaxy Map battle destination).** Find this fixed asteroid outpost in the Outer Reach near the Corsair Cluster; **Find a location** can take you there from any sector. Select a side to enter the same Blackwake Online Battle as the separate Online battle marker. Inspecting the hideout does not launch the sortie or change a vessel’s course. The landmark stays visible while its availability is checked and if the room is unavailable.

**Blackwake Online Battle (multiplayer exercise).** On the Galaxy Map, select the distinct **Online battle** marker or find **Blackwake · Online battle**. An **X** replaces the ordinary online marker while an NPC-originated round is running. Join that same room if you want to participate. When the server lists the room as joinable, choose **Join as Bifrost ally** or **Join Blackwake’s side** to enter the same public game room. The sides are temporary exercise teams, not guild or faction changes. This is separate from the timed Cross Battle X, its local Watch preview, and the solo Corsair/Custom tests. Both sides require a launch-ready owned fighter and a confirmed berth in the public game. The private Galaxy Map opens the public game; the mirror and public game do not share browser profiles. When a room is running, the full Galaxy Map can show a **Battle** alert once per round in that browser tab. Open it for a written invitation from your home admiral. Choose **Join as ally** to review entry or **Not now** to decline. No alert automatically launches or changes your affiliation.

- **Online beta:** one server-authoritative room, up to four human seats per side. Navy entrants may take Solo, Wingmen (up to one NPC), or Fleet (up to two), drawn from ready pilots and reserve Rift-4s aboard the carrier where the fighter is parked. Opposition enters alone. Eligible automatic bouts can start in the first six minutes of a half-hour UTC window when no active room blocks them. An NPC loss consumes one reserve Rift-4; a new recruit can become ready after two minutes, but does not replace the hull. The shared room uses simpler movement and one projectile per aligned firing event. It does not use the local Hammerdrive, three-round burst or ship collision tumble.
- **Local Corsair test:** three already-patrolling Blackwake pirate vessels. Blackwake is a modified Vessel-class freighter, not a pirate fighter or a Vanduul ship. Its detachable Size 3 Mini Turret fires a three-round burst. Its Hammerdrive and Hammerhead Prow give it a forward charge; fighters favour moving flybys rather than ramming. Collisions use mass and closing speed, with impact sound, contact sparks and heavier impacts able to tumble lighter ships. Do not apply this local balance to the online room.

During either local cross-tile test, a surviving fighter can retreat by reaching its original entry edge and pressing **Return to Battle Fleet Map**. Early retreat ends the test without a result or reward. After winning either cross-tile test, the fighter stays under your control. The **Return to Battle Fleet Map** button and a marker point to your original entry edge. You can fly there yourself and tap the button, or tap it from farther away to let the autopilot fly the fighter to the exit. Return puts you back airborne near the same carrier with your current ship, hull, and fuel. Once docked after returning, **Repair hull** restores hull HP after **30 seconds** in that test without refilling fuel, changing loadout, or saving the test result or berth.

### Corvette, freighters, and other previews

- **Playable test · Resolute escort:** In eligible Pegasus Battle Fleet flight, Resolute follows in loose formation. In Pegasus **Free Flight**, launch and then use **Test Resolute turret** to spawn a local practice drone. The rotating turret tracks and fires paired shots at valid targets. It does not fire in empty space. The drill does not change saves or rewards.
- **Preview · Keel-12 fitting bench:** open **Inspect Corvette loadout** in Pegasus’s Armada details. Four Size 4 sockets take a separate **Twin Turret** module with two barrels. The authored flight and roster fit has **one turret on the forward port socket**; the other three are empty. The bench can preview four independently aimed and fired mounts, up to eight projectiles if all fire one pair, but bench changes are temporary and do not affect the actual escort. The **Keel Drive**, **Keel He3 Generator**, **Keel Reserve Cell** and Size 4 turret are Corvette-only, not purchasable from Mara.
- **Preview · Civilian Freighter:** clean civilian Vessel-class freighter shown in the Shop terminal, distinct from the repurposed Blackwake. It is not a purchasable player fighter. **Orion** is the distinct freighter in Escort training. The unlinked six-ship carrier-launch observer is non-playable.
- **Ship Classes:** **Fighter → Vessel → Corvette → Frigate → Cruiser → Carrier**. Fighters are the small dedicated military craft; Vessel-class craft include freighters. **Support** describes a role. The deck-size poster uses an internal hangar for fighters and smaller vessels, an external berth for Corvette, and no carrier stowage for Frigate or Cruiser. Larger hulls are not currently player-selectable.
- **Planned:** player control of multicrew vessels, persistent corvette fitting, wider Armada management/attachment permissions, cross-device pilot accounts and shared career saves, more ship classes, transactional refuelling and restocking, and expanded story orders. The shared multiplayer beta is live with temporary teams and does not implement those systems.

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

Story progress is separate from the loaner tests and online exercise. Existing Bridge orders and audio stay in place; new story orders are deferred while the core flight loop is being refined.

Career ranks and milestones: **Cadet** (0), **Wingman** (10), **Ace** (25), **Flight Lead** (50), **Veteran** (75), **Vanguard** (150), **Rift Legend** (300). Qualifications occur in sequence.

## Latest verification

- Live browser: Pegasus Rift-4 loaner launched, redocked, stored and returned to its Deck Map. Bifrost Bastion-9 loaner launched, redocked and returned to Bifrost. The Galaxy Map’s Pirate Hideout entry and its side choices were visible when joinable. No live shared match or player save was used.
- Audit fixes: hid a watch-only fallback on the normal main menu, separated expedition loading from unavailable status, and extended narrow cockpit wrapping to short touch landscape and the fleet-return / online status groups. **685 automated tests passed.** Native iPhone layout was not independently exercised in this audit.

## Keeping this reference current

Current sources: `fighter-registry.js` (hull names), `pilot-credits.js` (catalog and economy), `pilot-missions.js` (rank gates), `carrier-*.html` (player labels), `game.js` (flight behavior and local encounters), `galaxy-map.js` (strategic UI), `server/carrier-stats.mjs` (formation, manifest and power), and `server/shared-flight.mjs` (shared combat and NPC roster). In the Site checkout, browser files live under `dist/` and server files under `server/`. When adding a feature, distinguish **implemented**, **playable test**, and **planned**, and update this reference only after verifying the corresponding behavior.
