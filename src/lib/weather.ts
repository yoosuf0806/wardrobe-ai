import "server-only";
import type { Weather } from "./types";

const OWM = "https://api.openweathermap.org/data/2.5";

export const DEFAULT_WEATHER: Weather = {
  temp_c: 21,
  feels_like_c: 21,
  humidity: 55,
  rain_probability: 0.1,
  wind_kph: null,
  condition: "Clear",
  location_name: null,
  latitude: null,
  source: "default",
};

interface OwmCurrent {
  name?: string;
  main: { temp: number; feels_like: number; humidity: number };
  wind?: { speed?: number };
  weather: { main: string; description: string }[];
}
interface OwmForecast {
  list: { pop?: number }[];
}

/** Live weather for the next ~12h. Falls back to a mild default when no key/location is available. */
export async function getWeather(lat: number | null, lon: number | null): Promise<Weather> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key || lat === null || lon === null) return { ...DEFAULT_WEATHER, latitude: lat };
  const q = `lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}&units=metric&appid=${key}`;
  try {
    const [cur, fc] = await Promise.all([
      fetch(`${OWM}/weather?${q}`, { next: { revalidate: 900 } }),
      fetch(`${OWM}/forecast?${q}&cnt=4`, { next: { revalidate: 900 } }),
    ]);
    if (!cur.ok) throw new Error(`OpenWeatherMap ${cur.status}`);
    const c = (await cur.json()) as OwmCurrent;
    const f = fc.ok ? ((await fc.json()) as OwmForecast) : { list: [] };
    const pop = Math.max(0, ...f.list.map((x) => x.pop ?? 0));
    const condition = c.weather[0]?.main ?? "Clear";
    return {
      temp_c: c.main.temp,
      feels_like_c: c.main.feels_like,
      humidity: c.main.humidity,
      rain_probability: /rain|drizzle|thunder/i.test(condition) ? Math.max(pop, 0.8) : pop,
      wind_kph: typeof c.wind?.speed === "number" ? Math.round(c.wind.speed * 3.6) : null,
      condition,
      location_name: c.name ?? null,
      latitude: lat,
      source: "openweathermap",
    };
  } catch (err) {
    console.error("weather lookup failed", err);
    return { ...DEFAULT_WEATHER, latitude: lat };
  }
}

export function manualWeather(tempC: number, rainy: boolean, latitude: number | null): Weather {
  return {
    temp_c: tempC,
    feels_like_c: tempC,
    humidity: rainy ? 85 : 55,
    rain_probability: rainy ? 0.8 : 0.1,
    wind_kph: null,
    condition: rainy ? "Rain" : "Clear",
    location_name: null,
    latitude,
    source: "manual",
  };
}
