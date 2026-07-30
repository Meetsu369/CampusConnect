-- Enable pg_cron if it is not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the Materialized View
CREATE MATERIALIZED VIEW mv_club_leaderboard AS
SELECT 
    c.id AS club_id,
    c.name,
    c.slug,
    c.logo_url,
    COALESCE(e.event_count, 0) AS event_count,
    COALESCE(r.rsvp_count, 0) AS rsvp_count,
    COALESCE(p.post_count, 0) AS post_count,
    (COALESCE(e.event_count, 0) * 10) + (COALESCE(r.rsvp_count, 0) * 2) + (COALESCE(p.post_count, 0) * 1) AS total_score,
    NOW() AS last_updated
FROM clubs c
LEFT JOIN (
    SELECT club_id, COUNT(*) as event_count FROM events GROUP BY club_id
) e ON c.id = e.club_id
LEFT JOIN (
    SELECT ev.club_id, COUNT(*) as rsvp_count 
    FROM event_rsvps er
    JOIN events ev ON er.event_id = ev.id
    GROUP BY ev.club_id
) r ON c.id = r.club_id
LEFT JOIN (
    SELECT club_id, COUNT(*) as post_count FROM posts GROUP BY club_id
) p ON c.id = p.club_id;

-- Create unique index to allow CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_club_leaderboard_club_id ON mv_club_leaderboard(club_id);

-- Grant select permission to API users
GRANT SELECT ON mv_club_leaderboard TO anon, authenticated;

-- Schedule the hourly refresh using pg_cron
SELECT cron.schedule('refresh_mv_club_leaderboard', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_club_leaderboard');