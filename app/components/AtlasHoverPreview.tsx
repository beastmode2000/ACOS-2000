"use client";

import { useEffect, useRef, useState } from "react";

export type AtlasHoverPreviewData = {
  kind: string;
  title: string;
  status?: string;
  summary?: string;
  fields: Array<{
    label: string;
    value: string;
  }>;
};

type Props = {
  data: AtlasHoverPreviewData;
  isMobile: boolean;
  onOpen: () => void;
};

export default function AtlasHoverPreview({
  data,
  isMobile,
  onOpen,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    function closeOnOutsidePress(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  return (
    <div
      ref={rootRef}
      className={`atlas-intelligence-preview-root${
        mobileOpen ? " atlas-intelligence-preview-root--open" : ""
      }`}
    >
      {isMobile ? (
        <button
          type="button"
          className="atlas-preview-info-trigger"
          aria-label={`Preview ${data.title}`}
          aria-expanded={mobileOpen}
          onClick={(event) => {
            event.stopPropagation();
            setMobileOpen((current) => !current);
          }}
        >
          i
        </button>
      ) : null}

      <aside
        className="atlas-intelligence-preview"
        aria-hidden={isMobile && !mobileOpen}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="atlas-preview-kicker">{data.kind}</div>

        <div className="atlas-preview-title-row">
          <h4>{data.title}</h4>
          {data.status ? (
            <span className="atlas-preview-status">{data.status}</span>
          ) : null}
        </div>

        {data.summary ? (
          <p className="atlas-preview-summary">{data.summary}</p>
        ) : null}

        <dl className="atlas-preview-fields">
          {data.fields.map((field) => (
            <div key={`${field.label}-${field.value}`}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          className="atlas-preview-open-button"
          onClick={() => {
            setMobileOpen(false);
            onOpen();
          }}
        >
          Open record
          <span aria-hidden="true">→</span>
        </button>
      </aside>
    </div>
  );
}

