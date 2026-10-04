"use client";

import { useEffect } from "react";
import { haptic, play } from "@/lib/sound";
import { toast, useStore } from "@/lib/store";
import { timerActions, timersStore } from "@/lib/timers";

/** Mounted globally: rings timers that finish while you're on another page. */
export function TimerWatcher() {
  const timers = useStore(timersStore, []);
  const running = timers.some((t) => t.endsAt);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      for (const t of timersStore.get()) {
        if (t.endsAt && t.endsAt <= Date.now()) {
          timerActions.markFired(t.id);
          play("alarm");
          haptic([200, 100, 200, 100, 300]);
          toast(`⏲️ ${t.label} is done!`, { ms: 6000 });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") navigator.serviceWorker?.ready.then((r) => r.showNotification(`⏲️ ${t.label} is done`, { icon: "/icon-192.png" })).catch(() => {});
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [running]);
  return null;
}
