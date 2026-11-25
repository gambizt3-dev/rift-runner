# Galaxy factions and independent crews

| Group | Type | Role on the Galaxy Map |
| --- | --- | --- |
| Federal Navy | Human faction | Pegasus and Bifrost keep their own admirals, companies and shared fleet spaces. |
| Pirates | Human faction | Blackwake is a ship; Corsair is the shared encounter, not an extra faction. |
| Aliens | Alien faction | A single roaming craft in the Frontier. This is the standing alien presence, not a timed mission, a queue, or an extra battle instance. |
| Independent (the Free People) | Unaffiliated human status | Civilians and players who take no side. Independent players can found their own guilds and independent crews can own and operate multicrew ships in the design. Guild membership and faction allegiance are separate; founding a guild does not make it a faction. The Wayfarer Armada is a read-only example showing how an independent guild can appear on the Galaxy Map. This update does not grant ships, transfer ownership, or impose a faction choice. |

The patrol and example armada are read-only: each position comes from a common UTC epoch, allowing observers with normally synced clocks to see the same route regardless of login time. This is not authoritative multiplayer movement. A later joinable encounter must consume server-owned state, with one world event and one outcome. Allegiance, standings, player ship ownership, combat, and story mode are not altered here. A later First Contact story may be layered on top of the patrol, without requiring players to accept a quest to see it.

Use Aliens as a temporary label until the faction has a name. The existing Vanduul practice/combat labels and assets are legacy; migrate them separately without changing existing mission IDs, saves or credits.

## Alien occupation

The first eligible planet is Meridian. The server rolls once per 20-minute window (22% prototype chance), never picks a protected starting world, and allows only one lockdown at a time. Status persists across restarts. The marker tells everyone the same thing on the Galaxy Map. A ready carrier must be within range; multiple eligible carriers rally to the same relief battle. Losing a relief attempt leaves lockdown in place. Winning a verified relief lifts it. Newly freed planets have a 40-minute cooldown.

The prototype includes the state machine, database migration, public chart marker and a persisted combat simulation against one alien craft. In the integration test, ships from both carriers fly and fire in one room; defeating the craft removes lockdown from the map. It does not start a live battle or change station inventories. To enable a playtest, attach the host to the worker scheduler and public route, route authenticated fleet-gate arrivals to the shared relief room using the host's battle ID, and expose only a sanitized per-pilot view to the game renderer. The server simulation settles the battle; clients never submit a winner. Only block services after server-side checks are integrated with arrival and resupply. Do not use a static client timer or a local button to liberate a planet.
