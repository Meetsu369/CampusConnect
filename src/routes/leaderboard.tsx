import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Leaderboard, LeaderboardHandle } from "@/components/Leaderboard";
import type { LeaderboardEntry } from "@/lib/leaderboard/types";

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const leaderboardRef = useRef<LeaderboardHandle>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const { data, error } = await supabase
          .from("mv_club_leaderboard")
          .select("*")
          .order("total_score", { ascending: false });

        if (error) {
          console.error("Error fetching leaderboard:", error);
          return;
        }

        if (data && data.length > 0) {
          // Set last updated from the first row's last_updated column
          setLastUpdated(new Date(data[0].last_updated));

          const newEntries: LeaderboardEntry[] = data.map((row, index) => ({
            key: row.club_id,
            rank: index + 1,
            name: row.name,
            score: row.total_score,
            avatarUrl: row.logo_url || undefined,
          }));

          setEntries(newEntries);
          leaderboardRef.current?.update(newEntries);
        }
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  const timeAgo = (date: Date) => {
    const minutes = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen py-10 px-4 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">Campus Leaderboard</h1>
        <p className="text-muted-foreground mt-2">
          The most active and competitive clubs on campus.
        </p>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {timeAgo(lastUpdated)} (refreshes hourly)
          </p>
        )}
      </div>

      <div className="w-full max-w-4xl border rounded-lg shadow-sm bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading leaderboard...</div>
        ) : (
          <Leaderboard ref={leaderboardRef} initialEntries={entries} />
        )}
      </div>
    </div>
  );
}
