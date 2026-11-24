# Core Gameplay Structure — Instructions for Dot

Approved design direction: 24 November 2026.

## Objective
Prioritise core gameplay and links between existing systems. Pause story mission expansion so fighters, weapons and combat can be tested independently. Preserve existing working features.

## World and ownership hierarchy
- Galaxy Map is the root and central authority for world location.
- Guild capital ships are linked to the Galaxy Map. A capital ship belongs to the guild, not an individual player.
- Player data is linked to the player's assigned guild capital ship. Multiple players may belong to the same capital ship.
- Each player's fighter, equipment and progression are linked to that player's personal data.
- Preserve existing capital ship movement on the Galaxy Map; do not expand galaxy simulation now.

## Deck Map
Rename the existing Guild Vessel page (verify current implementation name) to **Deck Map**. This is the interactive top-down view of the assigned large ship, regardless of ship class. Nest these four sections beneath it:
- Hangar: fighter selection, equipment fitting, battle mission selection and launch.
- Shop: purchasing equipment and other existing shop functions.
- Bridge: existing bridge interactions.
- Crew Quarters: existing crew interactions.
Audit existing branches and navigation; keep related functions under their appropriate parent without removing working functionality.

## Battle Map
Support two configurations of the core battle system: fighter-only combat, and fighter combat with the capital ship present. Players pilot their fighters, not the capital ship. The capital ship is an interactive combat entity that can fire and be fired upon as appropriate. Select and launch battle missions from the Hangar. Mission availability should ultimately depend on the guild ship's Galaxy Map position, but defer new galaxy encounter logic.

## Landing Page
Rename the existing Capital Page to **Landing Page** (verify current implementation name). When a fighter lands in the capital ship hangar, transition to the Landing Page. Keep this separate from the Deck Map. Preserve existing docking, resupply and navigation functionality.

## Navigation and gameplay loop
Galaxy Map establishes guild ship location; Deck Map provides access to ship facilities; Hangar selects/prepares fighter and launches battle missions; Battle Map handles combat; docking returns the player to the Landing Page. Ensure the player can access the core gameplay loop without being blocked by starter story mission progression. Preserve the existing story for later development.

## Persistence
For now, focus persistence on player data and Galaxy Map state, including guild capital ship assignments and fighter ownership. Battle instances may remain temporary. Do not introduce a new persistent battle simulation in this phase.

## Future features — explicitly deferred
Persistent/shared online pirate encounters that spawn and despawn; selecting galaxy encounters to add missions; range-based launch availability while the capital ship travels; visible active battle markers (X) on the Galaxy Map; other players joining active battle instances; expanded story missions. These are future design concepts, not current implementation tasks.

## Handoff to Dot
Read this document before further gameplay development. Review existing architecture against the hierarchy, standardise naming and navigation, establish the required links, and prioritise testing all existing fighters and weapons. Report discrepancies and changes. Avoid unnecessary rebuilds or expanding deferred features.
