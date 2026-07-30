-- Create the club analytics view for events and attendee counts
DROP VIEW IF EXISTS public.club_analytics_view CASCADE;

CREATE VIEW public.club_analytics_view AS
SELECT
  e.id,
  e.short_id,
  e.club_id,
  e.title,
  e.description,
  e.banner_url,
  e.event_date,
  e.start_date,
  e.end_date,
  e.location,
  e.created_by,
  e.created_at,
  e.updated_at,
  COALESCE(r.rsvp_count, 0)::bigint AS attendee_count
FROM public.events e
LEFT JOIN (
  SELECT event_id, COUNT(id) AS rsvp_count
  FROM public.event_rsvps
  GROUP BY event_id
) r ON e.id = r.event_id;

-- Grant select access to authenticated and anonymous roles
GRANT SELECT ON public.club_analytics_view TO authenticated, anon;
