import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { execSync } from "child_process";

describe("Materialized View: Club Leaderboard", () => {
  let supabase: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321",
      process.env.VITE_SUPABASE_ANON_KEY || "dummy",
    );
    serviceClient = createClient(
      process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321",
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
        "dummy",
    );
  });

  it("caches aggregated scores and updates on refresh", async () => {
    // 1. Get an existing club
    const { data: clubs } = await supabase.from("clubs").select("id").limit(1);
    const clubId = clubs?.[0]?.id;
    if (!clubId) {
      console.log("No clubs available to test leaderboard");
      return;
    }

    // Initial query
    const { data: initialData } = await supabase
      .from("mv_club_leaderboard")
      .select("total_score")
      .eq("club_id", clubId)
      .single();

    const initialScore = initialData?.total_score || 0;

    // 2. Create a new event for the club (+10 points)
    await serviceClient.from("events").insert({
      club_id: clubId,
      title: "Test Event for Leaderboard",
      description: "Testing caching logic",
      event_date: new Date().toISOString(),
    });

    // 3. Query the view again immediately (score should be UNCHANGED due to caching)
    const { data: cachedData } = await supabase
      .from("mv_club_leaderboard")
      .select("total_score")
      .eq("club_id", clubId)
      .single();

    const cachedScore = cachedData?.total_score || 0;
    expect(cachedScore).toBe(initialScore);

    // 4. Manually trigger the refresh command
    try {
      execSync(
        'supabase db psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_club_leaderboard;"',
      );
    } catch (e) {
      console.error("Failed to refresh materialized view:", e);
    }

    // 5. Query again (score should be updated, +10 for an event)
    const { data: refreshedData } = await supabase
      .from("mv_club_leaderboard")
      .select("total_score")
      .eq("club_id", clubId)
      .single();

    const refreshedScore = refreshedData?.total_score || 0;
    expect(refreshedScore).toBe(initialScore + 10);
  });
});
