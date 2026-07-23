"use client";

import React from "react";
import { colors } from "../lib/atlas-page-config";

export function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <span style={fieldLabelStyle}>{props.label}</span>

      {props.multiline ? (
        <textarea
          value={props.value}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          placeholder={props.placeholder}
          style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
        />
      ) : (
        <input
          type={props.type || "text"}
          value={props.value}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          placeholder={props.placeholder}
          style={inputStyle}
        />
      )}
    </label>
  );
}

export function SelectField<T extends string>(props: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <span style={fieldLabelStyle}>{props.label}</span>

      <select
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value as T)}
        style={inputStyle}
      >
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StatCard(props: {
  label: string;
  value: string | number;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={props.onClick} style={modernStatStyle}>
      <div style={statValueStyle}>{props.value}</div>
      <div style={statLabelStyle}>{props.label}</div>
    </button>
  );
}

export function AtlasMiniMark({ size = 30 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: Math.max(8, Math.round(size * 0.28)),
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        position: "relative",
        background: "#FFFFFF",
        border: `1px solid ${colors.gold2}`,
        boxShadow: "0 5px 14px rgba(7,27,47,0.12)",
      }}
    >
      <img
        src="/atlas-logo.png?v=atlas-real-logo"
        alt="Atlas"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </span>
  );
}

export function SectionHeader(props: {
  eyebrow?: string;
  title?: string;
  detail?: string;
  right?: React.ReactNode;
  brand?: boolean;
}) {
  if (!props.eyebrow && !props.title && !props.detail && !props.right) {
    return null;
  }

  return (
    <div style={sectionHeaderStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: props.brand ? 10 : 0,
          minWidth: 0,
        }}
      >
        {props.brand ? <AtlasMiniMark size={30} /> : null}

        <div style={{ minWidth: 0 }}>
          {props.eyebrow ? (
            <div style={eyebrowStyle}>{props.eyebrow}</div>
          ) : null}

          {props.title ? (
            <h2 style={sectionTitleStyle}>{props.title}</h2>
          ) : null}

          {props.detail ? (
            <p style={mutedSmallStyle}>{props.detail}</p>
          ) : null}
        </div>
      </div>

      {props.right ? <div style={buttonRowStyle}>{props.right}</div> : null}
    </div>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 12,
  fontWeight: 950,
};

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  borderRadius: 14,
  padding: "12px 13px",
  fontSize: 14,
  color: colors.text,
  background: "#FFFFFF",
  outline: "none",
  fontFamily: "inherit",
  minWidth: 0,
  fontWeight: 750,
};

const modernStatStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  padding: 18,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 16px 38px rgba(15,23,42,0.05)",
};

const statValueStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 31,
  fontWeight: 950,
  lineHeight: 1.05,
  letterSpacing: "-0.04em",
};

const statLabelStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: 0.8,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  marginBottom: 14,
  flexWrap: "wrap",
  minWidth: 0,
};

const eyebrowStyle: React.CSSProperties = {
  color: colors.gold,
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 1.8,
  textTransform: "uppercase",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const mutedSmallStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 13,
  margin: "4px 0 0",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};
