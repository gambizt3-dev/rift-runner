-- One authoritative active instance per configured exercise. Revision serializes
-- Worker requests arriving through separate isolates; no private pilot data in snapshots.
CREATE TABLE IF NOT EXISTS rift_shared_flight (
 battle_id TEXT PRIMARY KEY CHECK (battle_id = 'blackwake'),
 revision INTEGER NOT NULL CHECK (revision >= 1),
 model TEXT NOT NULL CHECK (length(model) <= 96000 AND json_valid(model))
);
