-- Fictional vessel identity; no account, membership or command permission is changed.
UPDATE rift_multicrew_vessel
SET vessel_name = COALESCE(vessel_name, 'Pegasus'),
    admiral = COALESCE(admiral, 'Bishop'),
    vessel_class = CASE WHEN vessel_class = 'Carrier' THEN 'Pegasus-class carrier' ELSE vessel_class END
WHERE vessel_id = 'rift-carrier' AND vessel_kind = 'carrier';
