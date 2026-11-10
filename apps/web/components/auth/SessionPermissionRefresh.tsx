"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_REFRESH_INTERVAL_MS = 30_000;

/**
 * Refreshes the current Supabase token when the app regains focus.
 * This updates trusted app_metadata claims without forcing the user to sign out.
 * Server-rendered authorization is then re-evaluated with router.refresh().
 */
export default function SessionPermissionRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let refreshing = false;
    let lastRefreshAt = 0;

    const refreshPermissions = () => {
      if (
        !active ||
        document.visibilityState !== "visible" ||
        refreshing ||
        Date.now() - lastRefreshAt < MIN_REFRESH_INTERVAL_MS
      ) {
        return;
      }

      lastRefreshAt = Date.now();
      refreshing = true;

      void supabase.auth.refreshSession()
        .then(({ data, error }) => {
          if (!active || error || !data.session) return;
          router.refresh();
        })
        .catch(() => {
          // A transient refresh failure must not terminate the active session.
        })
        .finally(() => {
          refreshing = false;
        });
    };

    window.addEventListener("focus", refreshPermissions);
    document.addEventListener("visibilitychange", refreshPermissions);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshPermissions);
      document.removeEventListener("visibilitychange", refreshPermissions);
    };
  }, [router]);

  return null;
}
