import * as React from "react";

interface LiveLocationSession {
  messageId: string;
  durationMinutes: number;
  expiresAt: Date;
}

export function useLiveLocationSharing() {
  const [activeSession, setActiveSession] =
    React.useState<LiveLocationSession | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = React.useRef<number | null>(null);

  const stopSharing = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setActiveSession(null);
  }, []);

  const startSharing = React.useCallback(
    (messageId: string, durationMinutes: number) => {
      stopSharing();

      const expiresAt = new Date(
        Date.now() + durationMinutes * 60 * 1000
      );
      setActiveSession({ messageId, durationMinutes, expiresAt });

      const postLocation = async () => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        try {
          const pos = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10_000,
              });
            }
          );

          if (new Date() >= expiresAt) {
            stopSharing();
            return;
          }

          let locationName: string | undefined;
          try {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=ru`,
              { headers: { "User-Agent": "nextx/1.0" } }
            );
            if (r.ok) {
              const j = (await r.json()) as { display_name?: string };
              if (j.display_name) {
                locationName = j.display_name
                  .split(",")
                  .slice(0, 2)
                  .join(",")
                  .trim();
              }
            }
          } catch {
            // ignore
          }

          await fetch(`/api/messages/${messageId}/location`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              locationName,
            }),
          });
        } catch {
          // Geolocation error — will retry on next interval
        }
      };

      // Initial update
      void postLocation();

      // Update every 30 seconds
      intervalRef.current = setInterval(() => {
        if (new Date() >= expiresAt) {
          stopSharing();
          return;
        }
        void postLocation();
      }, 30_000);
    },
    [stopSharing]
  );

  // Auto-stop on expiry
  React.useEffect(() => {
    if (!activeSession) return;
    const now = Date.now();
    const remaining = activeSession.expiresAt.getTime() - now;
    if (remaining <= 0) {
      stopSharing();
      return;
    }
    const timeout = setTimeout(stopSharing, remaining);
    return () => clearTimeout(timeout);
  }, [activeSession, stopSharing]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    activeSession,
    startSharing,
    stopSharing,
    isSharing: activeSession !== null,
  };
}
