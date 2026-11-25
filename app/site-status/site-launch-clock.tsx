"use client";
import { useEffect, useState } from "react";

export function SiteLaunchClock({ launchAt }: { launchAt: number }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((launchAt - Date.now()) / 1000)));
    const interval = window.setInterval(update, 1000);
    update();
    return () => window.clearInterval(interval);
  }, [launchAt]);
  if (seconds === null) return <time dateTime={new Date(launchAt).toISOString()} />;
  if (seconds === 0) return <button className="mt-8 underline" onClick={() => window.location.reload()}>Check if the site is open</button>;
  return <time className="mt-8 block font-mono tabular-nums" dateTime={new Date(launchAt).toISOString()}>
    {Math.floor(seconds / 86400)}d {Math.floor((seconds % 86400) / 3600)}h {Math.floor((seconds % 3600) / 60)}m {seconds % 60}s
  </time>;
}
