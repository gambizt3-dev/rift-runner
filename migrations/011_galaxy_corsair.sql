-- Separate from the historical Blackwake exercise and its carrier inventory.
CREATE TABLE IF NOT EXISTS rift_galaxy_corsair (
 event_id TEXT PRIMARY KEY,
 revision INTEGER NOT NULL CHECK(revision >= 1),
 model TEXT NOT NULL CHECK(json_valid(model)),
 settled_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS rift_galaxy_corsair_one_open
 ON rift_galaxy_corsair((1)) WHERE settled_at IS NULL;
