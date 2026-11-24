-- Read-only launch allocation; later gameplay may update these stock rows.
CREATE TABLE IF NOT EXISTS rift_carrier_supplies (
 vessel_id TEXT PRIMARY KEY CHECK (vessel_id IN ('rift-carrier','bifrost')),
 supply INTEGER NOT NULL CHECK (supply>=0)
);
INSERT OR IGNORE INTO rift_carrier_supplies(vessel_id,supply)
VALUES ('rift-carrier',100),('bifrost',100);
CREATE INDEX IF NOT EXISTS rift_parking_vessel_namespace
ON rift_fighter_parking(vessel_id,namespace_hash);
