-- Rename only Bifrost's original commander; leave the ship and navigation untouched.
UPDATE rift_multicrew_vessel
SET admiral = 'Adaline'
WHERE vessel_id = 'bifrost' AND vessel_kind = 'carrier' AND admiral = 'Adruline';
