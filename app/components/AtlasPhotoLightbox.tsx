"use client";

import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const STEP = 0.25;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function imageSource(image: HTMLImageElement) {
  return image.currentSrc || image.src || "";
}

function isContentPhoto(image: HTMLImageElement) {
  const src = imageSource(image).toLowerCase();
  const alt = String(image.alt || "").toLowerCase();
  const classes = String(image.className || "").toLowerCase();

  if (!src) return false;
  if (src.includes("atlas-logo")) return false;
  if (/\b(logo|icon|avatar|mark)\b/.test(alt)) return false;
  if (/\b(logo|icon|avatar|mark)\b/.test(classes)) return false;
  if (image.closest("aside, nav, header")) return false;

  const rect = image.getBoundingClientRect();
  const looksLikePhoto =
    /photo|image|thumbnail|thumb|hero|cover/.test(classes) ||
    Boolean(image.closest("[data-atlas-photo], [data-photo-id], [data-photo]"));

  if (!looksLikePhoto && rect.width < 72 && rect.height < 72) return false;
  return Boolean(image.closest("main"));
}

export default function AtlasPhotoLightbox() {
  const [source, setSource] = useState("");
  const [alt, setAlt] = useState("Photo");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const dragRef = useRef<{ start: Point; origin: Point } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const close = () => {
    setSource("");
    reset();
  };

  const zoomTo = (next: number) => {
    const value = clampScale(next);
    setScale(value);
    if (value === 1) setOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (!isContentPhoto(target)) return;

      const src = imageSource(target);
      if (!src) return;

      event.preventDefault();
      event.stopPropagation();
      setSource(src);
      setAlt(target.alt || "Photo");
      reset();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (!source) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "+" || event.key === "=") zoomTo(scale + STEP);
      if (event.key === "-") zoomTo(scale - STEP);
      if (event.key === "0") reset();
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [source, scale]);

  if (!source) return null;

  const touchDistance = (touches: React.TouchList) => {
    const first = touches.item(0);
    const second = touches.item(1);
    if (!first || !second) return 0;
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };

  return (
    <div
      className="atlas-photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onWheel={(event) => {
        event.preventDefault();
        zoomTo(scale + (event.deltaY < 0 ? STEP : -STEP));
      }}
    >
      <div className="atlas-photo-lightbox-toolbar" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => zoomTo(scale - STEP)} aria-label="Zoom out">−</button>
        <span>{Math.round(scale * 100)}%</span>
        <button type="button" onClick={() => zoomTo(scale + STEP)} aria-label="Zoom in">+</button>
        <button type="button" onClick={reset}>Fit</button>
        <button type="button" className="atlas-photo-lightbox-close" onClick={close} aria-label="Close photo">×</button>
      </div>

      <div
        className={`atlas-photo-lightbox-stage${scale > 1 ? " is-zoomed" : ""}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          if (scale <= 1) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            start: { x: event.clientX, y: event.clientY },
            origin: offset,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || scale <= 1) return;
          setOffset({
            x: drag.origin.x + event.clientX - drag.start.x,
            y: drag.origin.y + event.clientY - drag.start.y,
          });
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onTouchStart={(event) => {
          if (event.touches.length === 2) {
            pinchRef.current = { distance: touchDistance(event.touches), scale };
          }
        }}
        onTouchMove={(event) => {
          if (event.touches.length !== 2 || !pinchRef.current) return;
          const distance = touchDistance(event.touches);
          if (!distance || !pinchRef.current.distance) return;
          event.preventDefault();
          zoomTo(pinchRef.current.scale * (distance / pinchRef.current.distance));
        }}
        onTouchEnd={() => {
          pinchRef.current = null;
        }}
        onDoubleClick={() => zoomTo(scale === 1 ? 2 : 1)}
      >
        <img
          src={source}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        />
      </div>

      <style jsx global>{`
        .atlas-photo-lightbox {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          background: rgba(5, 13, 23, 0.94);
          padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
          touch-action: none;
        }

        .atlas-photo-lightbox-toolbar {
          justify-self: center;
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 10px;
          padding: 6px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 10px;
          background: rgba(12, 27, 43, 0.92);
          color: #fff;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
        }

        .atlas-photo-lightbox-toolbar button {
          min-width: 38px;
          height: 36px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 0 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .atlas-photo-lightbox-toolbar span {
          min-width: 52px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
        }

        .atlas-photo-lightbox-toolbar .atlas-photo-lightbox-close {
          font-size: 24px;
          line-height: 1;
          margin-left: 4px;
        }

        .atlas-photo-lightbox-stage {
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: zoom-in;
        }

        .atlas-photo-lightbox-stage.is-zoomed {
          cursor: grab;
        }

        .atlas-photo-lightbox-stage.is-zoomed:active {
          cursor: grabbing;
        }

        .atlas-photo-lightbox-stage img {
          display: block;
          max-width: 96vw;
          max-height: calc(100dvh - 82px);
          width: auto;
          height: auto;
          object-fit: contain;
          transform-origin: center center;
          user-select: none;
          -webkit-user-drag: none;
          transition: transform 80ms ease-out;
        }

        main img:not([data-atlas-no-lightbox]) {
          cursor: zoom-in;
        }

        @media (max-width: 700px) {
          .atlas-photo-lightbox {
            padding-left: 8px;
            padding-right: 8px;
          }

          .atlas-photo-lightbox-toolbar {
            width: min(100%, 360px);
            justify-content: center;
          }

          .atlas-photo-lightbox-toolbar button {
            min-width: 40px;
            height: 40px;
          }

          .atlas-photo-lightbox-stage img {
            max-width: 100%;
            max-height: calc(100dvh - 92px);
          }
        }
      `}</style>
    </div>
  );
}
