-- A Multicrew identity belongs to the physical vessel, not to a captain or pilot.
-- Only public vessel metadata lives here. Membership and permissions do not yet exist.
CREATE TABLE IF NOT EXISTS rift_multicrew_vessel (
  vessel_id TEXT PRIMARY KEY NOT NULL CHECK (length(vessel_id) BETWEEN 1 AND 64),
  designation TEXT NOT NULL CHECK (length(designation) BETWEEN 1 AND 80),
  vessel_name TEXT CHECK (vessel_name IS NULL OR length(vessel_name) BETWEEN 1 AND 80),
  vessel_class TEXT NOT NULL CHECK (length(vessel_class) BETWEEN 1 AND 60),
  profession TEXT NOT NULL CHECK (length(profession) BETWEEN 1 AND 100),
  admiral TEXT CHECK (admiral IS NULL OR length(admiral) BETWEEN 1 AND 64),
  vessel_kind TEXT NOT NULL CHECK (vessel_kind IN ('carrier','capital','multicrew')),
  galaxy_carrier_id TEXT UNIQUE REFERENCES rift_galaxy_carrier(carrier_id) ON DELETE RESTRICT,
  CHECK (galaxy_carrier_id IS NULL OR galaxy_carrier_id = vessel_id)
);

-- Idempotent: this neither overwrites registry identity nor touches movement.
INSERT OR IGNORE INTO rift_multicrew_vessel
  (vessel_id, designation, vessel_name, vessel_class, profession, admiral, vessel_kind, galaxy_carrier_id)
VALUES ('rift-carrier', 'Rift Carrier', NULL, 'Carrier', 'Military', NULL, 'carrier', 'rift-carrier');
