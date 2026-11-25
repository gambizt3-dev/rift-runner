# Orbital marketplace station playtest

The Meridian Ring, Waypost Ring and Frontier Ring are fixed contacts on the Galaxy Map. Chart icons are small; the local map uses the full ring as a large backdrop, with no baked-in fighter. The middle is open and a pilot can fly across it.

1. Confirm an owned, repaired, fitted fighter's berth on Pegasus or Bifrost.
2. Select a market on the chart while the parent carrier is within fighter range.
3. Use the normal shared launch deck and fly to the marked approach line before crossing.
4. The server moves the existing fighter into the chosen station's shared Battle Fleet Map. Pilots from eligible carriers are drawn from the same station ID. Old carrier rooms do not show visiting ships.
5. Fly to the lower return line. Return requires the home carrier in range and restores the same ship to its fleet map. Pilots can reconnect to the same station after a phone pause.

This is a flight-only addition. Docking, vendors, station collision/altitude, and trade are not available in this playtest. The branch builds on the unshipped shared Corsair candidate and should be staged in an isolated Worker before merging or deployment. It needs the existing Fleet Space and the candidate's Corsair migration. No extra marketplace storage table is required. Ship gallery artwork is intentionally not part of this change.
