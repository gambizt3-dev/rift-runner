# Carrier class foundation

Pegasus is the testbed, not a separate ruleset. Once a mechanic is proven, promote the implementation to shared carrier-class code and test it on both Pegasus and Bifrost. A future carrier should register a new identity rather than copy a carrier implementation.

- **Class rules:** common actions, eligibility and limits, launch and docking flows, inventory and pilot readiness rules, and Armada strength calculation. Each distinct ship class can define different rules when explicitly intended.
- **Identity:** stable vessel ID, display name, hull and art, admiral and portrait, faction, and optional formation members. An escort attached to one Armada does not become a class feature.
- **State:** independent location, squadron and reserves, pilot availability, resource balances, and battle/repair history. Shared rules are not shared balances; joining with the same class does not merge state.
- **Onboarding a carrier:** register identity, initialize only its own state, enable the common route/actions, and verify both feature parity and isolation of its inventory and losses. Do not copy carrier IDs or save data.

## Manpower

Both current carriers use one scoring function and the same carrier-class launchable-hull list. The Galaxy Map's headline is launch-ready NPC reserve weapon power times ready NPC pilots. Swift-2 and Bison-2 are stored reserves, but are excluded until the shared battle dispatcher can launch them. Personnel without a launchable reserve airframe do not create power. Resolute is listed in the formation, but its guns are not part of this reserve-fighter metric. The existing inventory-only API score remains as a legacy field. Human readiness and fitted player weapons are not currently verified and should not be estimated from parked ownership rows.

The class rules added here cover the manpower calculation. Other carrier systems still contain vessel-specific wiring and require migration and tests before a third carrier is plug-and-play.
