-- Keep whole-number carrier accounts separate from the player's pilot wallet.
CREATE TABLE IF NOT EXISTS rift_capital_resources (
 vessel_id TEXT PRIMARY KEY NOT NULL,
 he3 INTEGER NOT NULL CHECK(typeof(he3) = 'integer' AND he3 BETWEEN 0 AND 9007199254740991),
 credits INTEGER NOT NULL CHECK(typeof(credits) = 'integer' AND credits BETWEEN 0 AND 9007199254740991),
 metals INTEGER NOT NULL CHECK(typeof(metals) = 'integer' AND metals BETWEEN 0 AND 9007199254740991)
);
INSERT OR IGNORE INTO rift_capital_resources(vessel_id, he3, credits, metals)
VALUES ('rift-carrier', 300, 5000, 400);
