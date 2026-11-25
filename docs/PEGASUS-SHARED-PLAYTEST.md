# Pegasus shared exterior: first playtest

This is the first slice of the [shared fleet design](SHARED-FLEET-SPACE.md). It runs locally. It is not linked from the live Galaxy Map and does not touch the live player database.

## Run it

From the game repository root with Node 24:

```sh
node --test tests/fleet-space.test.mjs
node tools/fleet-space-smoke.mjs
```

Open `http://127.0.0.1:8792`, then open **Pilot Atlas** and **Pilot Nova** in separate tabs. They have distinct temporary identities and confirmed test berths on Pegasus. Click **Launch** in both. Use the arrow keys or on-screen buttons to turn and thrust. Both views should show two fighters in the same exterior. Refresh one tab or select **Disconnect → Enter / Reconnect**. That fighter should keep its ship identity, position and input sequence. Neither tab changes the other pilot's berth or loads a private hangar.

## What is implemented

- A Pegasus room keyed by the Armada ID, independent of the current Galaxy tile.
- Entry through an existing confirmed berth, limited simultaneous launch pads, manual takeoff, authoritative steering and movement, and snapshots visible to other pilots with an admitted berth.
- Reconnect to the same ship after a short outage. Stale input expires after 400 ms. Pads release after a grace period, and inactive prototype seats eventually expire.
- SQLite integration tests under the same D1-style adapter contract as the existing parking tests. They cover concurrent pad reservation, movement seen by the other pilot, reconnect, and rejected admission from another berth.

## Before opening it to players

Use an isolated preview Worker and database so two phones can test after Galaxy Map entry. Integrate the real top-down flight input and camera, plus authoritative dock, store and transit. After they pass, repeat with Bifrost and its own pad layout. Measure packet rate, contention and touch latency; the short polling loop is for local playtesting, not a scaling decision. Live career accounts, combat, ship damage, rewards, and Armada attacks are not implemented by this slice. Existing private solo and shared mission routes are unchanged.
