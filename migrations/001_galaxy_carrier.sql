-- Separate from pilot credentials and balances. The ID is stable across releases.
CREATE TABLE IF NOT EXISTS rift_galaxy_carrier (
  carrier_id TEXT PRIMARY KEY,
  guild_id TEXT,
  model_version INTEGER NOT NULL CHECK (model_version > 0),
  seed INTEGER NOT NULL CHECK (seed BETWEEN 1 AND 4294967295),
  epoch_ms INTEGER NOT NULL CHECK (epoch_ms > 0),
  checkpoint_at_ms INTEGER NOT NULL CHECK (checkpoint_at_ms >= epoch_ms),
  checkpoint_sector TEXT NOT NULL,
  checkpoint_x REAL NOT NULL,
  checkpoint_y REAL NOT NULL,
  checkpoint_heading REAL NOT NULL,
  checkpoint_speed REAL NOT NULL CHECK (checkpoint_speed >= 0),
  checkpoint_corsair INTEGER NOT NULL CHECK (checkpoint_corsair IN (0,1))
);
-- Rerunning this migration never replaces the launch epoch, seed or checkpoint.
INSERT OR IGNORE INTO rift_galaxy_carrier
 (carrier_id, model_version, seed, epoch_ms, checkpoint_at_ms, checkpoint_sector, checkpoint_x,
  checkpoint_y, checkpoint_heading, checkpoint_speed, checkpoint_corsair)
SELECT 'rift-carrier', 1, abs(random() % 4294967295)+1, ms, ms, 'reach', 563, 476, 0, 0, 0
FROM (SELECT CAST(strftime('%s','now') AS INTEGER)*1000 AS ms);
