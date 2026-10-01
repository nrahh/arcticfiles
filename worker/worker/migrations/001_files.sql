CREATE TABLE IF NOT EXISTS files (
									 id INTEGER PRIMARY KEY AUTOINCREMENT,
	                                 user_id TEXT NOT NULL,
	                                 file_key TEXT NOT NULL UNIQUE,
	                                 file_name TEXT NOT NULL,
	                                 file_size INTEGER NOT NULL,
	                                 content_type TEXT,
	                                 created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_user_id
	ON files(user_id);
