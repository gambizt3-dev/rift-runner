# Rift Runner: shared fleet space

**Status: design, not deployed.** Start with two pilots seeing each other outside Pegasus. Add real Armada attacks only after entry, launch, docking, and reconnect work reliably.

## What the player sees

```
Galaxy Map                         persistent online world
  ├─ Pegasus Armada → Battle Fleet Map    one shared exterior around the fleet
  │    └─ Dock → Store → Deck Map → Hangar    private to that pilot
  ├─ Bifrost Armada → Battle Fleet Map    same rules, its own fleet and pads
  └─ Public encounter → Battle Map        online combat; one Galaxy contact and one shared encounter
Cockpit → Choose Flight Mode
  ├─ Solo / Private                 free-flight trial, practice, and solo missions
  └─ Online Flight Mode            launch or join a server-hosted Battle Map
```

The **Galaxy Map**, **Battle Fleet Map**, and public **Battle Map** are all online and nested under the same world. Use **Battle Fleet Map** for the live fleet exterior and **Battle Map** for the shared combat area of a Galaxy encounter. Private solo runs are labelled separately and never presented as a public Battle Map. An Armada under attack fights in its **existing Battle Fleet Map**. Do not load a second version of Pegasus, Bifrost, or Resolute for that attack. The Galaxy marker opens the fight in the affected fleet's existing space. A pirate site such as Corsair keeps one Galaxy contact and one active encounter. Retire duplicate player-facing test entries once the replacement is verified.

### Two ways to start or join an online Battle Map

- **Galaxy Map:** Select an encounter marker to start or join that event. If it is an attack on an Armada, the fight happens in that Armada's existing Battle Fleet Map.
- **Carrier → Cockpit → Online Flight Mode:** Start or join a carrier-hosted online sortie. A newly opened sortie gets one server-hosted Battle Map and appears in the carrier's join panel for other eligible pilots. If the selected sortie targets an existing Galaxy encounter, join that same battle rather than creating a duplicate. Selecting Online Flight Mode alone does not begin an Armada attack or freeze the carrier.

Both paths use an explicit Launch and the applicable approach rules. An online sortie can have restricted admission without being a private solo run. Show its status, entry route and active player count before joining.

A pilot leaving the hangar sees their own ship on a launch pad, then taps **Launch**. They can see other players launch, fly, and dock. Wingmen use the same launch queue. When the pilot stores their ship, it disappears from the exterior and the pilot's own Hangar opens. Other players never see or enter that private room. Browsing a carrier's Deck Map or a Galaxy marker does not move the player's ship.

## Keep modes distinct

| Mode | Who can see it | What it can change |
| --- | --- | --- |
| Galaxy Map, Armada Battle Fleet Map, and public Battle Map | Pilots at the same location or in the same public encounter | Real ship location, damage, berth, and authorized resource changes |
| Multiplayer mission | Pilots invited or admitted to that mission | Only the mission's declared rewards, damage, and resource effects |
| Private solo | The pilot only | Career sorties can charge real carrier resources and damage assigned ships; practice and shop rentals must be clearly marked as no-save |
| Private hangar | Its pilot | The pilot's fits, ship selection, and permitted actions on their berth |

If the network drops, keep private practice available. Do not quietly replace a live fleet with a private copy. Show **Reconnecting**, and offer safe return or retry when the server confirms the ship's location. A Career Solo run that is offline must say whether resource changes are pending; it must not let a pilot spend the same stock twice.

## Shared state and movement

- **One space per Armada**, keyed by stable Armada ID, not host name, pilot, ship art, or current Galaxy tile. Its command ship can move to another tile without creating another room. Pegasus and Bifrost get their own spaces and pad layouts. Resolute belongs to Pegasus while attached; it must not appear as a second selectable fleet.
- **One ship in one place.** The server tracks each ship as stored, on a pad, airborne in fleet space, in transit, or in an encounter. Launch, transit, dock, and store use the existing berth rule: only confirmed storage changes the parked berth. Reserve the destination pad before showing docking clearance. Reserve one of Pegasus's four exterior pads for recovery; launch other craft in waves of up to three.
- **No teleporting to a fight.** Reach a public target from a fleet or launch platform in range; fighters and vessels cannot cross the galaxy independently. Keep the existing edge-to-edge departure and arrival. The server confirms which entry edge to use and carries the same hull HP, fit, fuel, and heat. Returning from battle enters the original fleet map from its departure edge.
- **The server owns shared outcomes.** Reuse the game's flight feel on the device, but send steering and firing input, not claimed positions, damage, kills, or credits. The fleet service assigns pads, ships, and transitions and publishes snapshots; ease other ships between updates. Keep Galaxy routes in the existing shared Galaxy state. Use a single coordinator per Armada for live traffic; persist berth and reward transactions in the database. Begin with only the few players and contacts visible in the fleet tile; measure mobile load before adding traffic.
- **Separate identities.** The current pilot PIN is a browser-local profile lock. Use two isolated profiles for the initial test and the existing confirmed berth to admit each ship. For real cross-device accounts, introduce a server-backed pilot identity with scoped sessions before public progression or fleet losses. Reconnect to the same ship and battle seat; never mint a replacement ship or a new reward from a retry.

## When an Armada comes under attack

1. **Detect and announce.** A hostile Armada within range can attack; an eligible friendly pilot or NPC commander can likewise initiate an attack within influence. The server creates one active attack record for the target fleet space and pauses the engaged fleet on the Galaxy Map. The marker shows the elapsed time, and Join/Defend opens the correct shared space. An attacker arriving through the fleet edge starts outside the carrier and pads.
2. **Fight and reinforce.** Pilots already in that exterior remain there. Attackers and eligible reinforcements join through the available approaches. Carrier NPC launches use finite ready ships and available pilots; exhausted reserves do not spawn more defenders. Reserved named pilots are not spent by the carrier automatically. Away from a protected launch or docking window, ordinary flight and combat rules apply.
3. **Resolve and settle.** If a side has no surviving fighters and no reinforcements available, the remaining side wins. If all opposing craft have left, begin a two-minute departure countdown; cancel it if an eligible ship comes back. An empty, inactive event should expire rather than hold the Galaxy route. Resolve once, credit each confirmed eligible fighter kill at 2.5 credits, and resume the Galaxy route. Keep capital loot separate and disabled until a capture rule and protections are agreed; don't treat pilots as loot by default.
4. **Recover.** Survivors can leave through the appropriate edge and dock. Reuse the current one-minute ordinary repair and four-minute rebuild for a destroyed fighter or vessel. Resource cost and rewards belong to the activity that incurred them, not to the number of retries, page reloads, or reconnects.

## Build and verify in order

| Stage | Acceptance check |
| --- | --- |
| 1. Same Pegasus exterior | Two separate profiles with confirmed berths open Pegasus from the Galaxy Map. Both see the same fleet and each other's launch and movement. A third pilot arrives while they are airborne. They agree on one map ID, and no one sees another pilot's private Hangar. |
| 2. Pads and rejoin | Simultaneous Dock requests never double-book a pad. Pilot A stays airborne while B refreshes or loses connection; B returns to the same ship, pad or airborne position as appropriate. Test each carrier's pad layout and the Civ Freighter as well as fighters. |
| 3. Galaxy transit and encounters | Open, dock, and store from the correct fleet, and approach from the right Galaxy edge without duplicating the craft. Start one Battle Map from Online Flight Mode and join it from a second carrier pilot. When a carrier sortie targets an active Galaxy encounter, both entry paths must return the same battle ID. Retreat back to the originating space. Practice remains private and doesn't populate the public exterior. |
| 4. Armada attack and settlement | Test a defender already in flight and an attacker entering, a late reinforcement, zero reserve, contested docking, the departure timer, held Galaxy position, and a single payout even after reload. Then compare iPhone touch layout and motion on two independent devices before tuning. |

## Audit baseline

- The current fleet exterior runs on the player's device. Pilots may see the same Galaxy position for Pegasus without sharing their flight, dock traffic, or battle state.
- The existing Blackwake shared-battle backend already passes automated multi-pilot admission, common movement and damage, capacity, and disconnected-seat tests. That evidence applies to a battle room, **not** to the Armada exterior and not to live two-phone testing. The Galaxy-linked Blackwake local combat route has no career payout; test credited Vandul separately.
- The live starter claim and four-minute repair start were verified with a throwaway browser profile. The current local flight suite checks boarding, launching all four flyable hulls, and docking and storing on either carrier. Shared-fleet play and cross-device progression remain unverified and unimplemented as described above.
- Balance order: first stop lost progress, duplicate seats, and duplicate payouts; then measure time-to-join, queue wait, time-to-defeat by hull and fit, and time forced out of play by repairs. The shared battle test normalizes human weapon damage, so use fitted local sorties to compare weapon feel. Don't adjust damage based on the standardized room.
