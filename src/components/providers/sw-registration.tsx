"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        // Check for SW update every 60s
        const interval = setInterval(() => reg.update(), 60000);

        // When new SW found, tell it to activate immediately
        reg.addEventListener("updatefound", () => {
          const newSw = reg.installing;
          if (!newSw) return;
          newSw.addEventListener("statechange", () => {
            if (
              newSw.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New SW ready — tell it to skip waiting, then reload
              newSw.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        return () => clearInterval(interval);
      }).catch(() => {
        // SW registration failed — non-critical
      });

      // Reload page when new SW takes over
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }
  }, []);

  return null;
}
