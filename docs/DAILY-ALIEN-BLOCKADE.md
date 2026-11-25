# Daily alien blockade playtest

At most one shared blockade starts across the galaxy in any rolling 24-hour period. After an eligible start, the same cooldown applies even if players clear it early. No catch-up events are spawned. A tick skips starts while a required carrier is already in combat.

The blackout ends after at most 20 minutes, including when there are no players or cron is late. A matching relief victory opens the route sooner. Protected starter, mission-critical and essential resupply worlds are ineligible. Use the explicit optional-world allowlist. Do not wire this prototype into essential docking, refuel, repair or existing mission requirements.

This is an opt-in playtest branch: no production cron, routes, database migration or Galaxy Map UI was deployed.
