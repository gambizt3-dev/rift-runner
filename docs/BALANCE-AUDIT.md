# Rift Runner core gameplay balance pass

Scope: private flight, cockpit and Hangar, carrier launch and docking, local Corsair and its optional wingman, the Corsair co-op test, Galaxy Map and Blackwake Online Battle, hulls, modules, weapons, NPC behaviour, repair, and the shop economy. This is an automated gameplay and balance pass, not a live two-person or iPhone playtest.

| System | Result |
|---|---|
| Ship classes | Fixed Corsair co-op using unrelated Blackwake exercise HP (24/20/32). It now preserves the local Rift-3, Stocky-2 and Bastion-2 hull values (20/26/16 HP). The test gives Stocky 12% less movement and Bastion 12% more than Rift-3, with corresponding slower/faster turning. Blackwake's separate exercise stays unchanged. |
| Weapons | Tightened the AK77's maximum spread from 7° to 4.5° on either side of aim so its long volley is easier to land. Kept 18 rounds, 2 damage each, and the 1.75-second recovery. S2 Sparrow, size-3 alternatives, and the Keel-4 turret retain their existing damage and mounts. |
| Engines, power and shield | Checked fitted mass, handling, thrust fuel, Surge cost and cooldown, regeneration, and heat behaviour. Kept the current speed/weight trade-offs and Aegis's five-second maximum duration with a sustained He3 cost. |
| Carrier and formation | Checked Pegasus/Bifrost selection, manual takeoff, docking and store, fleet-edge return, retreat/rejoin, and continuity for the optional wingman. The shared carrier Fleet Map is not part of this release. |
| Battles and networking | Checked private Solo, Corsair co-op same-carrier membership and matching ship damage on two clients, and the separate Galaxy-linked Blackwake room. Online Corsair still standardizes weapon damage; its purpose is to test shared combat. |
| Repairs and economy | Checked HP continuity, repair lockouts and persistence, starter purchases, mission payout and per-kill awards. Kept the chosen 30-second hull repair, four-minute reconstruction, and 2.5 credits per eligible kill. Practice rooms do not award career credits. |
| Controls and sound | Checked the touch event and sound policy regression fixtures, mute paths, canvas layout, and speaker-state transitions. Device feel and mix still need a human playtest. |
