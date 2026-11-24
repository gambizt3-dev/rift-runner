-- Private browser parking mirror, independent of the public galaxy and vessel registries.
CREATE TABLE IF NOT EXISTS rift_fighter_parking (
 namespace_hash TEXT NOT NULL CHECK(length(namespace_hash) = 64 AND namespace_hash NOT GLOB '*[^0-9a-f]*'),
 hull_id TEXT NOT NULL CHECK(hull_id IN ('rift-fighter','stocky-light-fighter','bastion-9')),
 vessel_id TEXT NOT NULL CHECK(vessel_id IN ('rift-carrier','bifrost')),
 bay INTEGER NOT NULL CHECK(bay IN (1,2,4,6)),
 revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(namespace_hash, hull_id),
 UNIQUE(namespace_hash, vessel_id, bay)
);
