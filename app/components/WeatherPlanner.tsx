"use client";

import React, { useEffect, useMemo, useState } from "react";

type ForecastDay = {
  date: string;
  code: number;
  high: number;
  low: number;
  rainChance: number;
  rainAmount: number;
  wind: number;
  gust: number;
};

type WeatherApiResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
    wind_gusts_10m_max?: number[];
  };
};

const colors = {
  navy: "#0B1E33",
  navy2: "#102A44",
  gold: "#C99A3D",
  goldSoft: "#FFF7E6",
  bg: "#F5F7FA",
  card: "#FFFFFF",
  soft: "#FBFCFE",
  line: "#DCE4EC",
  text: "#172331",
  muted: "#607086",
  green: "#087443",
  greenBg: "#EAF7F1",
  blue: "#175CD3",
  blueBg: "#EDF3FF",
  orange: "#B54708",
  orangeBg: "#FFF4E5",
  red: "#B42318",
  redBg: "#FEECEC",
};

const MERCER_ISLAND_LATITUDE = 47.57;
const MERCER_ISLAND_LONGITUDE = -122.22;

function round(value: number | undefined, fallback = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.round(value);
}

function formatDay(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function formatDate(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function getWeatherIcon(code: number) {
  if ([0].includes(code)) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if ([3].includes(code)) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "⛅";
}

function getWeatherLabel(code: number) {
  if ([0].includes(code)) return "Clear";
  if ([1, 2].includes(code)) return "Partly clear";
  if ([3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([80, 81, 82].includes(code)) return "Showers";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Storm";
  return "Mixed";
}

function getPlanningAdvice(day: ForecastDay) {
  if (day.rainAmount >= 0.35 || day.rainChance >= 75) {
    return {
      label: "Skip irrigation",
      detail: "Rain should handle watering. Watch drainage, gutters, basement, dock, and low spots.",
      background: colors.blueBg,
      color: colors.blue,
      border: "#C8D9FF",
    };
  }

  if (day.wind >= 16 || day.gust >= 25) {
    return {
      label: "Wind watch",
      detail: "Avoid spraying. Secure dock items, umbrellas, covers, water toys, and loose outdoor furniture.",
      background: colors.orangeBg,
      color: colors.orange,
      border: "#FFD8A8",
    };
  }

  if (day.rainChance >= 45 || day.rainAmount >= 0.1) {
    return {
      label: "Rain possible",
      detail: "Good for irrigation savings. Be careful with mowing, staining, spraying, and exterior paint work.",
      background: colors.goldSoft,
      color: colors.orange,
      border: "#F4D492",
    };
  }

  if (day.high >= 82 && day.rainChance <= 20) {
    return {
      label: "Irrigation likely",
      detail: "Hot and dry. Check beds, pots, turf edges, new plantings, and sprinkler coverage.",
      background: colors.redBg,
      color: colors.red,
      border: "#FACACA",
    };
  }

  if (day.high >= 74 && day.rainChance <= 25 && day.wind < 14) {
    return {
      label: "Good yard day",
      detail: "Good for mowing, edging, blowing, weeding, sport court reset, and exterior cleanup.",
      background: colors.greenBg,
      color: colors.green,
      border: "#BDE7D2",
    };
  }

  return {
    label: "Good check day",
    detail: "Use for walkthroughs, irrigation inspection, light cleanup, dock check, and planning.",
    background: colors.soft,
    color: colors.navy,
    border: colors.line,
  };
}

function summarizeWeek(days: ForecastDay[]) {
  if (!days.length) {
    return {
      bestYardDay: "Loading",
      irrigation: "Checking",
      rainWatch: "Checking",
      windWatch: "Checking",
    };
  }

  const best = [...days]
    .filter((day) => day.rainChance < 35 && day.rainAmount < 0.08 && day.wind < 14)
    .sort((a, b) => b.high - a.high)[0];

  const rainDays = days.filter((day) => day.rainChance >= 45 || day.rainAmount >= 0.1);
  const dryHotDays = days.filter((day) => day.rainChance <= 20 && day.rainAmount < 0.05 && day.high >= 78);
  const windyDays = days.filter((day) => day.wind >= 16 || day.gust >= 25);

  return {
    bestYardDay: best ? `${formatDay(best.date)} ${formatDate(best.date)}` : "No perfect day",
    irrigation: dryHotDays.length >= 2 ? "Likely needed" : rainDays.length ? "May reduce watering" : "Normal check",
    rainWatch: rainDays.length ? `${rainDays.length} day${rainDays.length === 1 ? "" : "s"}` : "Low",
    windWatch: windyDays.length ? `${windyDays.length} day${windyDays.length === 1 ? "" : "s"}` : "Low",
  };
}

function buildForecast(data: WeatherApiResponse): ForecastDay[] {
  const daily = data.daily;
  const dates = daily?.time ?? [];

  return dates.map((date, index) => ({
    date,
    code: round(daily?.weather_code?.[index]),
    high: round(daily?.temperature_2m_max?.[index]),
    low: round(daily?.temperature_2m_min?.[index]),
    rainChance: round(daily?.precipitation_probability_max?.[index]),
    rainAmount: Number((daily?.precipitation_sum?.[index] ?? 0).toFixed(2)),
    wind: round(daily?.wind_speed_10m_max?.[index]),
    gust: round(daily?.wind_gusts_10m_max?.[index]),
  }));
}

export default function WeatherPlanner() {
  const [days, setDays] = useState<ForecastDay[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const visibleDays = useMemo(() => (expanded ? days : days.slice(0, 7)), [days, expanded]);
  const summary = useMemo(() => summarizeWeek(days.slice(0, 7)), [days]);

  useEffect(() => {
    let alive = true;

    async function loadWeather() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          latitude: String(MERCER_ISLAND_LATITUDE),
          longitude: String(MERCER_ISLAND_LONGITUDE),
          daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "precipitation_sum",
            "wind_speed_10m_max",
            "wind_gusts_10m_max",
          ].join(","),
          temperature_unit: "fahrenheit",
          wind_speed_unit: "mph",
          precipitation_unit: "inch",
          timezone: "America/Los_Angeles",
          forecast_days: "16",
        });

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Weather request failed.");

        const data = (await response.json()) as WeatherApiResponse;
        const forecast = buildForecast(data);

        if (alive) setDays(forecast);
      } catch {
        if (alive) setError("Weather forecast is unavailable right now.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadWeather();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={styles.wrap}>
      <div style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Live Forecast</div>
          <h2 style={styles.title}>Yard Work + Irrigation Planner</h2>
          <p style={styles.subtitle}>
            Built for mowing, irrigation checks, staining, dock prep, exterior cleanup, and weather-sensitive work at 2000.
          </p>
        </div>

        <button type="button" onClick={() => setExpanded((current) => !current)} style={styles.toggleButton}>
          {expanded ? "Show 7 Days" : "Show More Days"}
        </button>
      </div>

      <div style={styles.summaryGrid}>
        <SummaryCard label="Best Yard Window" value={summary.bestYardDay} />
        <SummaryCard label="Irrigation" value={summary.irrigation} />
        <SummaryCard label="Rain Watch" value={summary.rainWatch} />
        <SummaryCard label="Wind Watch" value={summary.windWatch} />
      </div>

      {loading ? <div style={styles.empty}>Loading live forecast...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      {!loading && !error ? (
        <>
          <div style={styles.forecastGrid}>
            {visibleDays.map((day) => {
              const advice = getPlanningAdvice(day);

              return (
                <article key={day.date} style={styles.dayCard}>
                  <div style={styles.dayTop}>
                    <div>
                      <div style={styles.dayName}>{formatDay(day.date)}</div>
                      <div style={styles.date}>{formatDate(day.date)}</div>
                    </div>
                    <div style={styles.icon}>{getWeatherIcon(day.code)}</div>
                  </div>

                  <div style={styles.tempRow}>
                    <span style={styles.high}>{day.high}°</span>
                    <span style={styles.low}>{day.low}°</span>
                  </div>

                  <div style={styles.condition}>{getWeatherLabel(day.code)}</div>

                  <div style={styles.detailGrid}>
                    <WeatherMetric label="Rain" value={`${day.rainChance}%`} />
                    <WeatherMetric label="Amount" value={`${day.rainAmount}"`} />
                    <WeatherMetric label="Wind" value={`${day.wind} mph`} />
                    <WeatherMetric label="Gust" value={`${day.gust} mph`} />
                  </div>

                  <div
                    style={{
                      ...styles.advice,
                      background: advice.background,
                      color: advice.color,
                      borderColor: advice.border,
                    }}
                  >
                    <strong>{advice.label}</strong>
                    <span>{advice.detail}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div style={styles.watchGrid}>
            <WatchCard
              title="Yard Work"
              text="Best for mowing, edging, blowing, weeding, sport court reset, beach cleanup, and exterior walkthroughs."
            />
            <WatchCard
              title="Irrigation"
              text="Use rain chance, rain amount, and hot dry days to decide whether to water, reduce watering, or inspect coverage."
            />
            <WatchCard
              title="Exterior Work"
              text="Avoid staining, spraying, and delicate exterior work on rainy, windy, or very humid days."
            />
            <WatchCard
              title="Dock / Lake"
              text="Watch wind and gusts before dock work, boat prep, SeaDoo use, lift checks, and water trampoline setup."
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  );
}

function WeatherMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

function WatchCard({ title, text }: { title: string; text: string }) {
  return (
    <div style={styles.watchCard}>
      <div style={styles.watchTitle}>{title}</div>
      <p style={styles.watchText}>{text}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "grid",
    gap: 18,
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "flex-start",
    border: `1px solid ${colors.line}`,
    borderRadius: 24,
    padding: 22,
    background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navy2} 62%, #173A5C 100%)`,
    color: "#FFFFFF",
    boxShadow: "0 18px 35px rgba(11, 30, 51, 0.16)",
  },
  eyebrow: {
    color: colors.gold2,
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.05,
    fontWeight: 950,
    letterSpacing: -0.8,
  },
  subtitle: {
    margin: "10px 0 0",
    maxWidth: 760,
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    lineHeight: 1.5,
    fontWeight: 650,
  },
  toggleButton: {
    border: `1px solid rgba(255,255,255,0.24)`,
    background: colors.gold,
    color: colors.navy,
    borderRadius: 999,
    padding: "12px 16px",
    fontWeight: 950,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 10px 22px rgba(0,0,0,0.16)",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },
  summaryCard: {
    border: `1px solid ${colors.line}`,
    background: colors.card,
    borderRadius: 20,
    padding: 16,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: 950,
    marginTop: 5,
  },
  forecastGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 14,
  },
  dayCard: {
    border: `1px solid ${colors.line}`,
    background: colors.card,
    borderRadius: 22,
    padding: 16,
    display: "grid",
    gap: 12,
    boxShadow: "0 10px 26px rgba(11, 30, 51, 0.06)",
  },
  dayTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  dayName: {
    color: colors.navy,
    fontSize: 21,
    fontWeight: 950,
  },
  date: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: 800,
    marginTop: 2,
  },
  icon: {
    fontSize: 30,
    lineHeight: 1,
  },
  tempRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  high: {
    color: colors.navy,
    fontSize: 36,
    fontWeight: 950,
    letterSpacing: -1,
  },
  low: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: 900,
  },
  condition: {
    color: colors.text,
    fontSize: 13,
    fontWeight: 900,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  metric: {
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    background: colors.soft,
    padding: 10,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: 950,
    marginTop: 3,
  },
  advice: {
    border: "1px solid",
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gap: 4,
    lineHeight: 1.35,
    fontSize: 13,
    fontWeight: 700,
  },
  watchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
  },
  watchCard: {
    border: `1px solid ${colors.line}`,
    borderRadius: 18,
    padding: 18,
    background: colors.soft,
    minHeight: 130,
  },
  watchTitle: {
    color: colors.navy,
    fontSize: 21,
    fontWeight: 950,
    marginBottom: 8,
  },
  watchText: {
    color: colors.muted,
    lineHeight: 1.5,
    margin: 0,
    fontSize: 14,
    fontWeight: 650,
  },
  empty: {
    border: `1px solid ${colors.line}`,
    background: colors.card,
    borderRadius: 20,
    padding: 18,
    color: colors.muted,
    fontWeight: 850,
  },
  error: {
    border: "1px solid #FACACA",
    background: colors.redBg,
    color: colors.red,
    borderRadius: 20,
    padding: 18,
    fontWeight: 900,
  },
};
