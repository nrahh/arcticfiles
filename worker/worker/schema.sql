CREATE TABLE IF NOT EXISTS shares (
									  code TEXT PRIMARY KEY,
	                                  file_key TEXT NOT NULL,
	                                  owner_id TEXT NOT NULL,
	                                  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS shares_file_key
	ON shares(file_key);
