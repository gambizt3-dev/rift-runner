# Galaxy Map cooperative Corsair playtest

**Status:** Server prototype on a development branch. The live Galaxy Map and pilot economy are unchanged.

One public Galaxy contact represents one occurrence. Players bring their own fighters. The first rollout admits multiple pilots from Pegasus; only after that works should the second rollout admit Bifrost from its own approach. Both carriers must join the same occurrence rather than opening a fleet-specific copy.

## Implemented in the prototype

- One server-owned combat model, one pirate formation, elapsed timer, and one terminal result. The new storage is separate from the older Blackwake exercise and its live carrier reserves.
- Opening two events concurrently converges on the same active event. A retry of an already finished occurrence returns its original result. Two pilots joining at once retain separate ships and do not overwrite one another.
- The first NPC wave waits one minute so human pilots have time to reach the event. The host can advance that wave with nobody connected. No additional wave is created just because someone opens the chart or reconnects.
- Reconnect restores the same seat and remaining hull. The last withdrawal opens a two-minute return window. A pilot who comes back cancels it. The server keeps the first recorded outcome.
- Tests cover shared movement and combat state, two-player firing, an unattended NPC wave, the withdrawal timer, separate Bifrost approach coordinates behind a server-side test option, and concurrent persistence.

## Run the checks

```sh
node --test tests/corsair-event.test.mjs
```

## Before launch

Connect the trusted Galaxy route and approach receipts to the server-side admission path. Use a scheduler to create and advance the occurrence, then show its marker, player count and result through the existing Galaxy Map and battle view. Do not accept berth identity, an approach proof, damage or rewards as claims from the client. Run a two-phone Pegasus playtest before enabling Bifrost in production. Any credit rewards must have a separate confirmed settlement and must not be paid by this prototype. There is no new cockpit test-mode option.
