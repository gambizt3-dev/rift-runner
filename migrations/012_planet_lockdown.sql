CREATE TABLE IF NOT EXISTS rift_planet_lockdown (
 slot INTEGER PRIMARY KEY CHECK(slot=1),
 revision INTEGER NOT NULL CHECK(revision>=1),
 state TEXT NOT NULL CHECK(json_valid(state))
);
