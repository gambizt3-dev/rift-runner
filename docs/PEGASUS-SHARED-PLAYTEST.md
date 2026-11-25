# Shared carrier exterior: first playtest

This is the first slice of the [shared fleet design](SHARED-FLEET-SPACE.md). It runs locally. It is not linked from the live Galaxy Map and does not touch the live player database.

## Run it

From the game repository root with Node 24:

```sh
node --test tests/fleet-space.test.mjs
node tools/fleet-space-smoke.mjs
```

Open `http://127.0.0.1:8792`, then open **Atlas** and **Nova** in separate tabs for Pegasus, or **Ember** and **Comet** for Bifrost. Each pair has distinct temporary identities and confirmed berths on its own carrier. Open a tab for each carrier to verify that their traffic stays separate. For each pilot, select their Armada on the preview **Galaxy Map**, choose **Go to launch deck** from their private Hangar, then click **Launch**. Use the arrow keys or on-screen buttons to turn and thrust. Both views should show two fighters in the same exterior. Refresh and reopen your Armada, or select **Disconnect → Reconnect**. That fighter should keep its ship identity, position and input sequence. To test recovery, fly both fighters toward the orange pad, release thrust inside the small circle, and choose **Request Docking**. The first request holds the order; the waiting pilot can dock after the first selects **Store Inside** or clears the pad. Storage hides the fighter from other pilots and opens that pilot’s private preview Hangar with the same ship. It does not change the live career berth or open the live Hangar.

## What is implemented

- Pegasus and Bifrost rooms keyed by their Armada IDs, independent of the current Galaxy tile, with one shared service and separate pad layouts.
- Entry through an existing confirmed berth, limited simultaneous launch pads, manual takeoff, authoritative steering and movement, and snapshots visible to other pilots with an admitted berth.
- Reconnect to the same ship after a short outage. Stale input expires after 400 ms. Pads release after a grace period, and inactive prototype seats eventually expire.
- SQLite integration tests under the same D1-style adapter contract as the existing parking tests. They cover concurrent pad reservation, movement seen by the other pilot, reconnect, contested recovery and storage, and rejected admission from another berth.

## Before opening it to players

Use an isolated preview Worker and database so two phones can test after Galaxy Map entry. Integrate the real top-down flight input and camera, plus the real moving deck, docking alignment, private hangar handoff and transit. Repeat the live-device checks for Bifrost. New carriers use the same service by registering their Armada and berth configuration plus their own landing pad layout. A cruiser can opt into this foundation when it has an Armada identity and working launch and recovery facilities. No cruiser is enabled by this change. Measure packet rate, contention and touch latency; the short polling loop is for local playtesting, not a scaling decision. Live career accounts, combat, ship damage, rewards, and Armada attacks are not implemented by this slice. Existing private solo and shared mission routes are unchanged.
