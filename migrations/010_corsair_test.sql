-- Practice rooms are isolated from the Galaxy battle and career supply roster.
CREATE TABLE IF NOT EXISTS rift_corsair_test (
 vessel_id TEXT PRIMARY KEY CHECK (vessel_id IN ('rift-carrier','bifrost')),
 revision INTEGER NOT NULL CHECK (revision >= 1),
 model TEXT NOT NULL CHECK (length(model) <= 96000 AND json_valid(model))
);
