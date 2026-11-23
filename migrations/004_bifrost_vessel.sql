-- Add a separate ship and movement anchor. Existing navigation and identity rows are unchanged.
INSERT OR IGNORE INTO rift_galaxy_carrier
  (carrier_id, model_version, seed, epoch_ms, checkpoint_at_ms, checkpoint_sector, checkpoint_x,
   checkpoint_y, checkpoint_heading, checkpoint_speed, checkpoint_corsair)
SELECT 'bifrost', 1, abs(random() % 4294967295)+1, ms, ms, 'reach', 1700, -340, 0, 0, 0
FROM (SELECT CAST(strftime('%s','now') AS INTEGER)*1000 AS ms);

INSERT OR IGNORE INTO rift_multicrew_vessel
  (vessel_id, designation, vessel_name, vessel_class, profession, admiral, vessel_kind, galaxy_carrier_id)
VALUES ('bifrost', 'Bifrost', 'Bifrost', 'Bifrost-class carrier', 'Military', 'Adruline', 'carrier', 'bifrost');
