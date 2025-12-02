-- Base migration: Create schema_migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial migration
INSERT INTO schema_migrations (version, applied_at)
VALUES ('000_schema_migrations', CURRENT_TIMESTAMP);