-- The room follows the Armada, independent of its current Galaxy tile.
CREATE TABLE IF NOT EXISTS rift_fleet_space (
  armada_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  model TEXT NOT NULL CHECK (json_valid(model))
);
