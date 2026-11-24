-- One fixed authored encounter. Registrations contain only scoped pseudonymous references.
CREATE TABLE IF NOT EXISTS rift_cross_battle_participation (
 encounter_id TEXT NOT NULL CHECK(encounter_id = 'blackwake'),
 namespace_hash TEXT NOT NULL CHECK(length(namespace_hash) = 64 AND namespace_hash NOT GLOB '*[^0-9a-f]*'),
 hull_id TEXT NOT NULL CHECK(hull_id IN ('rift-fighter','stocky-light-fighter','bastion-9')),
 vessel_id TEXT NOT NULL CHECK(vessel_id IN ('rift-carrier','bifrost')),
 role TEXT NOT NULL CHECK(role = 'intercept' OR (role = 'reinforce' AND vessel_id = 'rift-carrier')),
 PRIMARY KEY(encounter_id, namespace_hash, hull_id)
);
