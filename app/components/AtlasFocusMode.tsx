"use client";

import React from "react";

export type AtlasFocusPayload = {
  id: string;
  title?: string;
  tokens: string[];
};

const FOCUS_EVENT = "atlas:focus-change";

function cleanToken(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeTokens(values: unknown[]) {
  return Array.from(
    new Set(values.map(cleanToken).filter((value) => value.length >= 2)),
  );
}

export function focusTokensFromPreview(preview: any, title?: string) {
  const fieldValues = Array.isArray(preview?.fields)
    ? preview.fields.flatMap((field: any) => [field?.label, field?.value])
    : [];

  return normalizeTokens([
    title,
    preview?.title,
    preview?.eyebrow,
    preview?.summary,
    ...fieldValues,
  ]);
}

export function publishAtlasFocus(payload: AtlasFocusPayload | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(FOCUS_EVENT, {
      detail: payload,
    }),
  );
}

export default function AtlasFocusTarget({
  id,
  tokens,
  children,
  className = "",
}: {
  id: string;
  tokens: string[];
  children: React.ReactNode;
  className?: string;
}) {
  const normalizedTokens = React.useMemo(
    () => normalizeTokens(tokens),
    [tokens],
  );

  const [focusState, setFocusState] = React.useState<
    "idle" | "focused" | "related" | "dimmed"
  >("idle");

  React.useEffect(() => {
    function handleFocus(event: Event) {
      const payload = (event as CustomEvent<AtlasFocusPayload | null>).detail;

      if (!payload) {
        setFocusState("idle");
        return;
      }

      if (payload.id === id) {
        setFocusState("focused");
        return;
      }

      const activeTokens = normalizeTokens(payload.tokens || []);
      const related = normalizedTokens.some((token) =>
        activeTokens.some(
          (activeToken) =>
            activeToken === token ||
            (activeToken.length >= 4 &&
              token.length >= 4 &&
              (activeToken.includes(token) || token.includes(activeToken))),
        ),
      );

      setFocusState(related ? "related" : "dimmed");
    }

    window.addEventListener(FOCUS_EVENT, handleFocus as EventListener);

    return () => {
      window.removeEventListener(FOCUS_EVENT, handleFocus as EventListener);
    };
  }, [id, normalizedTokens]);

  return (
    <div
      className={`atlas-focus-target atlas-focus-${focusState} ${className}`.trim()}
      onMouseEnter={() =>
        publishAtlasFocus({
          id,
          tokens: normalizedTokens,
        })
      }
      onMouseLeave={() => publishAtlasFocus(null)}
      onFocusCapture={() =>
        publishAtlasFocus({
          id,
          tokens: normalizedTokens,
        })
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          publishAtlasFocus(null);
        }
      }}
    >
      {children}
    </div>
  );
}

