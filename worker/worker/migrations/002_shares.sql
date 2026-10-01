CREATE TABLE IF NOT EXISTS shares (
									  code TEXT PRIMARY KEY,
	                                  owner_id TEXT NOT NULL,
	                                  file_key TEXT NOT NULL,
	                                  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shares_file_key
	ON shares(file_key);
