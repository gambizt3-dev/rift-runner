# Carrier class foundation

Pegasus is the testbed, not a separate ruleset. Once a mechanic is proven, promote the implementation to shared carrier-class code and test it on both Pegasus and Bifrost. A future carrier should register a new identity rather than copy a carrier implementation.

- **Class rules:** common actions, eligibility and limits, launch and docking flows, inventory and pilot readiness rules, and Armada strength calculation. Each distinct ship class can define different rules when explicitly intended.
- **Identity:** stable vessel ID, display name, hull and art, admiral and portrait, faction, and optional formation members. An escort attached to one Armada does not become a class feature.
- **State:** independent location, squadron and reserves, pilot availability, resource balances, and battle/repair history. Shared rules are not shared balances; joining with the same class does not merge state.
- **Onboarding a carrier:** register identity, initialize only its own state, enable the common route/actions, and verify both feature parity and isolation of its inventory and losses. Do not copy carrier IDs or save data.

## Ship tiers and command roles

| Tier | Hull classes | Command role and purpose |
| --- | --- | --- |
| Low | Fighter, vessel (including freighters) | Pilot only. These hulls have basic ship features and no captain or admiral role. |
| Mid | Corvette, frigate | Can have a **Captain**. The Resolute is a corvette and can escort an Armada without becoming its flagship. |
| High | Cruiser, carrier | Can have an **Admiral** and serve as the guild's flagship, leading the Armada and giving missions through its admiral. |

The tier sets which command roles a hull can support; it does not automatically appoint an officer. A tier is not a shared feature list: cruisers and carriers can both be high-tier without using identical hull-class rules.

## Carrier pilot pool

Each carrier maintains its own finite NPC pilot roster. Its fighters and vessels draw from that **same** roster, not separate pools. Each NPC deployment needs one ready pilot and one ready, launchable hull. A pilot already deployed or recovering cannot be assigned again. The number of NPC hulls that can launch is bounded by whichever count is lower: ready pilots or ready launchable hulls. Carrier stock, pilots, and losses do not transfer between Pegasus, Bifrost, and future carriers simply because they share a class.

**Implementation status:** The shared battle dispatcher already uses a limited carrier roster for NPC fighters. Carrier-supplied vessel deployment is a design rule for the future, not live functionality. Other Pegasus-specific flight flows still need to move onto the common carrier implementation.

## Wingman cards and assigned fighters

A formation pad pairs a **pilot card** with a separate **fighter hull**. Personal wingman cards are special to the player. They are not inventory owned by the carrier, and destroying a fighter does not erase its pilot's identity. A destroyed hull can be repaired. A downed **personal wingman card** must be revived; if it is not revived before the applicable deadline, it dies and is removed. The exact deadline, revival cost, and acquisition rules are not yet specified. Do not apply permanent card loss to the carrier's generic NPC pool, which uses the existing roster recovery rules.

For now the carrier only supplies basic NPC pilot cards. Pegasus and Bifrost use the same local picker and Wing Two launch logic with independent saved pad assignments and their own Rift-3 readiness. Boarding from the four-pad hangar is solo. Boarding from the formation hall keeps the pilot in that hall until cockpit entry; the Battle Fleet Map starts the pilot docked on the carrier’s own exterior launch deck. An assigned, ready wingman follows the pilot’s takeoff in supported private flight modes. The picker is not a personal-card inventory or a revival system. Its availability check is a snapshot, not a launch reservation or a persistent stock write. Decorative parked ships do not represent usable inventory. Leena and Tomas are not reclassified as player-owned on the basis of this design alone.

## Pegasus logistics reserve

Admiral Bishop's carrier owns five unarmed Civilian Freighters. These are not player inventory and do not contribute weapon power. Their intended use is logistics and future freighter missions. A Pegasus member may request one as a formation escort by pairing it with any available pilot on the same finite carrier roster. Ownership does not transfer. Players own only the hulls they acquired and brought; assigning a carrier-owned wingman does not add it to their inventory. A reserve vessel may not be issued twice or deployed without a ready pilot. The Solo Free Flight loaner is separate and does not reserve a real hull. Pegasus crew may use these internal ships for supported Pegasus missions without gaining ownership. Persistent formation borrowing and mission eligibility still need to be implemented.

### Formation borrowing: implementation design

1. Bind a crew's carrier membership to its authenticated pilot ID on the server. A visit or a docking receipt alone does not grant access to a carrier's stock. The current home-company choice is local profile data, so this membership check is still missing.
2. Save one independent **pilot + hull** pair per selected pad, up to eight escort pads around the player's front-middle lead. Do not reserve anything just by editing the plan. The picker should offer available pilots from the carrier pool and intact hulls from its own stock, including Swift-2, Bison-2 and Pegasus's five unarmed Civilian Freighters when flight support exists.
3. On a supported mission or formation launch, the server checks membership, mission eligibility, each unique ready pilot, and the requested hull quantities. Reserve the entire group against the same availability used by online sorties in one compare-and-swap transaction; if a pilot or hull has been taken since selection, return the conflict and let the player adjust. Never silently replace an unavailable card or fabricate a hull.
4. Start with the player's selected ship on the original deck of the carrier. In formation, the player lifts off first, then up to three wingmen stage at a time, leaving a random recovery pad open. An eight-wing group uses three waves (3 + 3 + 2). Freighters join formation and fly logistic objectives but never fire. Keep a stable class-appropriate fit for the actual hull rather than spawning every assignment as a Rift-3.
5. Return surviving pairs to the carrier and settle losses exactly once. Release abandoned reservations without minting hulls, and do not grant a mission reward or write a permanent loss from an unverified test session. Existing NPC recovery and future personal-card revival remain distinct. Private sessions need a trusted outcome path before consuming shared reserve resources; the current local wingman path is only a readiness snapshot.

## Manpower

Both current carriers use one scoring function and the same carrier-class launchable-hull list. The Galaxy Map's headline is launch-ready NPC reserve weapon power times ready NPC pilots. Swift-2 and Bison-2 are stored reserves, but are excluded until the shared battle dispatcher can launch them. Personnel without a launchable reserve airframe do not create power. Resolute is listed in the formation, but its guns are not part of this reserve-fighter metric. The existing inventory-only API score remains as a legacy field. Human readiness and fitted player weapons are not currently verified and should not be estimated from parked ownership rows.

The class rules added here cover the manpower calculation. Other carrier systems still contain vessel-specific wiring and require migration and tests before a third carrier is plug-and-play.
