"use client";

import { format, parseISO } from "date-fns";
import { motion } from "motion/react";
import { MapPin, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { getKV, setKV, useKV } from "@/lib/data";
import { saveSettings, useSettings } from "@/lib/settings";
import { toast } from "@/lib/store";
import { Btn, Card } from "./ui";

interface WeatherData {
  at: number;
  tz: string;
  temp: number;
  feels: number;
  code: number;
  isDay: number;
  humidity: number;
  wind: number;
  daily: { date: string; max: number; min: number; rain: number; code: number }[];
}

/** WMO weather codes → emoji + label. */
export function weatherLook(code: number, isDay = 1): { emoji: string; label: string } {
  if (code === 0) return { emoji: isDay ? "☀️" : "🌙", label: "Clear" };
  if (code <= 2) return { emoji: isDay ? "🌤️" : "☁️", label: "Partly cloudy" };
  if (code === 3) return { emoji: "☁️", label: "Overcast" };
  if (code <= 48) return { emoji: "🌫️", label: "Fog" };
  if (code <= 57) return { emoji: "🌦️", label: "Drizzle" };
  if (code <= 67) return { emoji: "🌧️", label: "Rain" };
  if (code <= 77) return { emoji: "🌨️", label: "Snow" };
  if (code <= 82) return { emoji: "🌧️", label: "Showers" };
  if (code <= 86) return { emoji: "🌨️", label: "Snow showers" };
  return { emoji: "⛈️", label: "Thunderstorm" };
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Weather unavailable");
  const j = await r.json();
  return {
    at: Date.now(),
    tz: j.timezone ?? "",
    temp: j.current.temperature_2m,
    feels: j.current.apparent_temperature,
    code: j.current.weather_code,
    isDay: j.current.is_day,
    humidity: j.current.relative_humidity_2m,
    wind: j.current.wind_speed_10m,
    daily: j.daily.time.map((d: string, i: number) => ({ date: d, max: j.daily.temperature_2m_max[i], min: j.daily.temperature_2m_min[i], rain: j.daily.precipitation_probability_max[i] ?? 0, code: j.daily.weather_code[i] })),
  };
}

export async function refreshWeather(force = false) {
  const s = await (await import("@/lib/settings")).loadSettings();
  if (!s.weather || s.weatherLat == null || s.weatherLon == null) return;
  const cached = await getKV<WeatherData | null>("weatherCache", null);
  if (!force && cached && Date.now() - cached.at < 30 * 60_000) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  await setKV("weatherCache", await fetchWeather(s.weatherLat, s.weatherLon));
}

export function WeatherWidget() {
  const s = useSettings();
  const data = useKV<WeatherData | null>("weatherCache", null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (s.weather) refreshWeather().catch(() => {});
  }, [s.weather, s.weatherLat]);

  const enable = () => {
    if (!navigator.geolocation) return toast("Location not available", { emoji: "📍" });
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await saveSettings({ weather: true, weatherLat: pos.coords.latitude, weatherLon: pos.coords.longitude });
        try {
          await refreshWeather(true);
        } catch {
          toast("Couldn't load weather", { emoji: "⚠️" });
        }
        setBusy(false);
      },
      () => {
        setBusy(false);
        toast("Location permission denied", { emoji: "📍" });
      },
      { maximumAge: 3600_000, timeout: 15_000 },
    );
  };

  if (!s.weather || !data)
    return (
      <Card className="flex items-center gap-3">
        <span className="text-3xl">🌤️</span>
        <div className="flex-1 text-[14px]">
          <div className="font-semibold">Weather</div>
          <div className="text-muted">Uses your location once, then shows a free Open-Meteo forecast. Works offline from cache.</div>
        </div>
        <Btn variant="soft" className="px-3 py-2 text-[14px]" onClick={enable} disabled={busy}>
          {busy ? "…" : "Enable"}
        </Btn>
      </Card>
    );

  const look = weatherLook(data.code, data.isDay);
  const place = data.tz.split("/").pop()?.replace(/_/g, " ");
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4">
        <motion.span animate={{ y: [0, -4, 0], rotate: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="text-[52px] leading-none">
          {look.emoji}
        </motion.span>
        <div className="flex-1">
          <div className="text-[34px] font-semibold leading-none">{Math.round(data.temp)}°</div>
          <div className="text-[14px] text-muted">
            {look.label} · feels {Math.round(data.feels)}°
          </div>
          <div className="flex items-center gap-1 text-[12px] text-muted">
            <MapPin size={11} /> {place} · 💧{data.humidity}% · 💨{Math.round(data.wind)} km/h
          </div>
        </div>
        <button
          aria-label="Refresh weather"
          onClick={async () => {
            setBusy(true);
            await refreshWeather(true).catch(() => toast("Offline. Showing cached weather", { emoji: "📴" }));
            setBusy(false);
          }}
          className="self-start text-muted"
        >
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[12px]">
        {data.daily.map((d, i) => (
          <div key={d.date} className="rounded-xl bg-hairline/50 py-1.5">
            <div className="font-semibold">{i === 0 ? "Today" : format(parseISO(d.date), "EEE")}</div>
            <div className="text-lg">{weatherLook(d.code).emoji}</div>
            <div>
              {Math.round(d.max)}° <span className="text-muted">{Math.round(d.min)}°</span>
            </div>
            {d.rain >= 30 && <div className="text-[10px] text-accent">☔{d.rain}%</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}
