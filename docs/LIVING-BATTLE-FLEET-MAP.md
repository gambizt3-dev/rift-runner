# How to build a living, shared Battle Fleet Map

The **Galaxy Map** shows where an Armada is. Its **Battle Fleet Map** is the online space around it. The carrier and its escorts continue their assigned activity even when nobody is watching. When a pilot enters, they see what is happening now. They don't create a fresh copy of the fleet.

## 1. Register the Armada

Give each Armada a stable ID. Register its command ship, hull class, carrier berth ID, exterior layout, escort formation, launch and recovery pads, and arrival edges. Use `server/fleet-space-catalog.mjs` for the current prototype. Derive each pad's position and heading from the hull's position so it moves with the ship. Pegasus and Bifrost use the same rules and different layouts. A future cruiser may join if it has its own Armada and supports launch and recovery. A cruiser traveling as an escort appears only in its parent Armada's space.

## 2. Give the Galaxy Map and fleet space distinct jobs

The Galaxy service owns the Armada's sector, route, position, and strategic orders. The fleet service owns nearby flight, dock and launch queues, escort positions, and any active fight. Look up the fleet by Armada ID when a player selects it on the Galaxy Map. Carry the selected ship's confirmed berth or approach admission into that same space. Never key the room on the player, the current sector, or the displayed ship name.

A public event marker opens a shared Battle Map or the target Armada's existing fleet space. **Cockpit → Online Flight Mode** can also start or join a server-hosted Battle Map. When both routes refer to the same event, use one battle ID. Keep the Hangar private and do not send solo flight traffic into the public space.

## 3. Make it live between visits

- Store the last authoritative snapshot and timestamp. Record long-lived state such as carrier course, escort orders, docked craft, inventories, pilot reservations, and attack status.
- With pilots present, the server runs one simulation for the Armada. Clients send control input and render snapshots; they don't choose their own positions, damage, clearances, or rewards. On reconnect, give the pilot the same ship and a fresh snapshot. Never replay held controls from before the disconnect.
- When the space is empty, advance predictable travel from the last timestamp and the Galaxy route. Schedule the next event that actually needs work, such as a repair completing, a station restock, or combat with a deadline. Don't run an empty render loop or depend on a player's phone to keep the world alive.
- Derive simple motion from elapsed time; persist events with lasting consequences exactly once. A reload must not add another escort, consume another pilot, or pay the same reward twice. An expired attack must close and release the carrier's halted Galaxy route even if no one is connected.
- Show real status at entry: online player count, fleet activity, dock availability, and active attack time where applicable. If the service is unavailable, say so; do not substitute a local fleet that looks online.

## 4. Connect the first playable loop

1. Start from a confirmed berth or a valid in-range approach.
2. Reserve a launch pad. The pilot explicitly launches; the pad becomes available only once the fighter clears it. Keep one recovery pad reserved and queue outgoing waves rather than overwriting an occupied pad.
3. Show pilots, escorts and traffic in the same authoritative fleet. On docking, reserve one pad per ship and validate the approach. On **Store Inside**, remove the ship from the exterior only after confirmation, then return the pilot to their private Hangar.
4. Add one scheduled NPC activity, such as an escort returning to dock for repair, before enabling combat. Confirm it completes without a pilot connected.
5. Add Armada encounters only after transit and docking work. A hostile Armada in range attacks the existing fleet space. Hold the engaged course while combat is active; close the event using the outcome and timer rules in the [shared fleet design](SHARED-FLEET-SPACE.md).

## 5. Verify before enabling in production

| Check | What must happen |
| --- | --- |
| Two phones enter the same Armada | Both see the same carrier and each other's launch and movement. |
| Phones use different Armadas | Each sees only its own local fleet traffic. |
| Both request the last open pad | Only one is assigned; the other enters the queue. |
| One phone reconnects | The same craft and location resume; no duplicate ship or berth appears. |
| Both phones close the game | The strategic route, scheduled NPC action, and deadlines still advance. |
| Carrier changes sector | The same Armada space and attached fleet follow it. |
| An Armada is attacked | The Galaxy marker joins the same fleet; settlement happens once and the carrier resumes its route. |

**Current status:** The [local playtest](PEGASUS-SHARED-PLAYTEST.md) proves launch, shared movement, and reconnect on Pegasus and Bifrost using distinct test pilots. Local integration tests also prove that two pilots cannot occupy the same recovery pad and the queue advances after storage. Production Galaxy Map entry, live landing and hangar integration, unattended fleet activity, and Armada attacks still need implementation and live-device verification. Start on an isolated preview and open production access only after the loop passes.
