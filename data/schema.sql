ALTER DATABASE tracker SET synchronous_commit = off;

-- log_min_duration_statement='300'

CREATE TABLE IF NOT EXISTS events (
  id SERIAL,
  domain_id TEXT,
  user_id TEXT,
  session_id TEXT,
  event TEXT,
  PRIMARY KEY (id, domain_id, user_id)
) PARTITION BY HASH(domain_id, user_id);
DO $$ DECLARE index INTEGER := 0;
  BEGIN
    LOOP
      EXIT WHEN index = 32 ;
      EXECUTE 'CREATE TABLE IF NOT EXISTS events_part' || index || ' PARTITION OF events FOR VALUES WITH (MODULUS 32, REMAINDER ' || index || '); ';
      index := index + 1 ;
    END LOOP ;
  END;
$$;

ALTER TABLE events ADD COLUMN IF NOT EXISTS event_name TEXT;