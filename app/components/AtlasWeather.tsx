"use client";

import React from "react";
import type { WeatherDay } from "../lib/atlas-types";
import { SectionHeader } from "./AtlasUiPrimitives";

type Props = {
  sectionStyle: React.CSSProperties;
  loadWeather: () => void | Promise<void>;
  goldButtonStyle: React.CSSProperties;
  stackStyle: React.CSSProperties;
  noticeStyle: React.CSSProperties;
  weatherStatus: string;
  mutedSmallStyle: React.CSSProperties;
  weatherStripStyle: React.CSSProperties;
  weatherDays: WeatherDay[];
  setSelectedWeatherDate: (date: string) => void;
  selectedWeather?: WeatherDay | null;
  colors: { gold: string; line: string };
  weatherCardStyle: React.CSSProperties;
  weatherCardTopStyle: React.CSSProperties;
  weatherIcon: (code: number) => React.ReactNode;
  weatherIconStyle: React.CSSProperties;
  weatherTempStyle: React.CSSProperties;
  weatherLowStyle: React.CSSProperties;
  weatherBarTrackStyle: React.CSSProperties;
  weatherBarFillStyle: React.CSSProperties;
  weatherMiniGridStyle: React.CSSProperties;
  irrigationAdvice: (day: WeatherDay) => string;
  weatherAdviceSmallStyle: React.CSSProperties;
  weatherDetailPanelStyle: React.CSSProperties;
  weatherDetailHeaderStyle: React.CSSProperties;
  eyebrowStyle: React.CSSProperties;
  weatherDetailTitleStyle: React.CSSProperties;
  weatherText: (code: number) => string;
  weatherDetailConditionStyle: React.CSSProperties;
  weatherDetailIconStyle: React.CSSProperties;
  weatherDetailGridStyle: React.CSSProperties;
  weatherDetailMetricStyle: React.CSSProperties;
  weatherDetailNotesGridStyle: React.CSSProperties;
  weatherDetailNoteStyle: React.CSSProperties;
  weatherDayPlanning: (day: WeatherDay) => string;
};

export default function AtlasWeather(props: Props) {
  const {
    sectionStyle, loadWeather, goldButtonStyle, stackStyle, noticeStyle,
    weatherStatus, mutedSmallStyle, weatherStripStyle, weatherDays,
    setSelectedWeatherDate, selectedWeather, colors, weatherCardStyle,
    weatherCardTopStyle, weatherIcon, weatherIconStyle, weatherTempStyle,
    weatherLowStyle, weatherBarTrackStyle, weatherBarFillStyle, weatherMiniGridStyle,
    irrigationAdvice, weatherAdviceSmallStyle, weatherDetailPanelStyle,
    weatherDetailHeaderStyle, eyebrowStyle, weatherDetailTitleStyle, weatherText,
    weatherDetailConditionStyle, weatherDetailIconStyle, weatherDetailGridStyle,
    weatherDetailMetricStyle, weatherDetailNotesGridStyle, weatherDetailNoteStyle,
    weatherDayPlanning,
  } = props;

  return (
    <section style={sectionStyle}>
      <SectionHeader
        eyebrow="7-Day Forecast"
        title="Weather / Irrigation Planning"
        detail="Real 7-day forecast with irrigation recommendations."
        right={
          <button type="button" onClick={() => void loadWeather()} style={goldButtonStyle}>
            Refresh Weather
          </button>
        }
      />

      <div style={stackStyle}>
        <div style={noticeStyle}>
          <strong>{weatherStatus}</strong>
          <p style={mutedSmallStyle}>
            Forecast location is the 2000 area. Uses rain chance, rain amount, wind, and ET0 for irrigation planning.
          </p>
        </div>

        <div style={weatherStripStyle}>
          {weatherDays.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedWeatherDate(day.date)}
              style={{
                ...weatherCardStyle,
                borderColor: day.date === selectedWeather?.date ? colors.gold : colors.line,
                boxShadow: day.date === selectedWeather?.date
                  ? "0 18px 38px rgba(201,154,61,0.24)"
                  : "0 12px 26px rgba(15,23,42,0.06)",
              }}
            >
              <div style={weatherCardTopStyle}>
                <div>
                  <strong>
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}
                  </strong>
                  <p style={mutedSmallStyle}>
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div style={weatherIconStyle}>{weatherIcon(day.code)}</div>
              </div>

              <div style={weatherTempStyle}>{day.high}°</div>
              <div style={weatherLowStyle}>{day.low}° low</div>

              <div style={weatherBarTrackStyle}>
                <div style={{ ...weatherBarFillStyle, width: `${Math.max(12, Math.min(100, day.precipChance))}%` }} />
              </div>

              <div style={weatherMiniGridStyle}>
                <span>Rain {day.precipChance}%</span>
                <span>{day.precipAmount}&quot;</span>
                <span>Wind {day.windMax} mph</span>
                <span>ET0 {day.et0}&quot;</span>
              </div>

              <p style={weatherAdviceSmallStyle}>{irrigationAdvice(day)}</p>
            </button>
          ))}
        </div>

        {selectedWeather ? (
          <section style={weatherDetailPanelStyle}>
            <div style={weatherDetailHeaderStyle}>
              <div>
                <div style={eyebrowStyle}>Selected Day</div>
                <h3 style={weatherDetailTitleStyle}>
                  {new Date(`${selectedWeather.date}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "long", month: "long", day: "numeric",
                  })}
                </h3>
                <p style={weatherDetailConditionStyle}>{weatherText(selectedWeather.code)}</p>
              </div>
              <div style={weatherDetailIconStyle}>{weatherIcon(selectedWeather.code)}</div>
            </div>

            <div style={weatherDetailGridStyle}>
              <div style={weatherDetailMetricStyle}><span>High</span><strong>{selectedWeather.high}°F</strong></div>
              <div style={weatherDetailMetricStyle}><span>Low</span><strong>{selectedWeather.low}°F</strong></div>
              <div style={weatherDetailMetricStyle}><span>Rain chance</span><strong>{selectedWeather.precipChance}%</strong></div>
              <div style={weatherDetailMetricStyle}><span>Expected rain</span><strong>{selectedWeather.precipAmount}&quot;</strong></div>
              <div style={weatherDetailMetricStyle}><span>Maximum wind</span><strong>{selectedWeather.windMax} mph</strong></div>
              <div style={weatherDetailMetricStyle}><span>Water loss / ET0</span><strong>{selectedWeather.et0}&quot;</strong></div>
            </div>

            <div style={weatherDetailNotesGridStyle}>
              <div style={weatherDetailNoteStyle}>
                <strong>Irrigation</strong>
                <p>{irrigationAdvice(selectedWeather)}</p>
              </div>
              <div style={weatherDetailNoteStyle}>
                <strong>Workday planning</strong>
                <p>{weatherDayPlanning(selectedWeather)}</p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
