"use client";

import { useEffect, useMemo, useState } from "react";

type MobileNavItem = {
  label: string;
  key: string;
};

const PRIMARY_LABELS = new Set(["dashboard", "work", "assets", "calendar", "more"]);

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function mobileControl(element: Element) {
  return Boolean(
    element.closest(
      ".atlas-mobile-field-bottom-nav, .atlas-mobile-field-more-overlay, .atlas-mobile-full-access-overlay",
    ),
  );
}

function sidebarRoot() {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("aside, nav"),
  ).filter((element) => !mobileControl(element));

  const scored = candidates.map((element) => {
    const labels = Array.from(element.querySelectorAll<HTMLElement>("button, a"))
      .map((control) => normalized(control.textContent))
      .filter(Boolean);
    const required = ["dashboard", "work", "assets", "calendar", "locations"];
    const score = required.filter((label) => labels.includes(label)).length * 100 + labels.length;
    return { element, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score >= 400 ? scored[0].element : null;
}

function liveNavItems(): MobileNavItem[] {
  const root = sidebarRoot();
  if (!root) return [];

  const seen = new Set<string>();
  const items: MobileNavItem[] = [];

  Array.from(root.querySelectorAll<HTMLElement>("button, a")).forEach((control) => {
    if (mobileControl(control)) return;
    const label = String(control.textContent || "").trim().replace(/\s+/g, " ");
    const key = normalized(label);
    if (!label || !key || PRIMARY_LABELS.has(key) || key === "menu") return;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ label, key });
  });

  return items;
}

function navigateTo(key: string) {
  const root = sidebarRoot();
  if (!root) return false;

  const control = Array.from(root.querySelectorAll<HTMLElement>("button, a")).find(
    (candidate) => !mobileControl(candidate) && normalized(candidate.textContent) === key,
  );

  if (!control) return false;
  control.click();
  return true;
}

export default function AtlasMobileFullAccess() {
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MobileNavItem[]>([]);
  const sortedItems = useMemo(() => items, [items]);

  useEffect(() => {
    const syncMobile = () => {
      const next = window.innerWidth <= 900;
      setMobile(next);
      if (!next) setOpen(false);
    };

    const openFullMenu = () => {
      setItems(liveNavItems());
      setOpen(true);
    };

    const handleNavigationRequest = (event: MouseEvent) => {
      if (window.innerWidth > 900) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".atlas-mobile-full-access-overlay")) return;

      const control = target.closest<HTMLElement>("button, a");
      if (!control) return;
      const label = normalized(control.textContent);
      const isBottomMore = Boolean(control.closest(".atlas-mobile-field-bottom-nav")) && label === "more";
      const isTopMenu = !mobileControl(control) && label === "menu";
      if (!isBottomMore && !isTopMenu) return;

      event.preventDefault();
      event.stopPropagation();
      openFullMenu();
    };

    syncMobile();
    window.addEventListener("resize", syncMobile);
    document.addEventListener("click", handleNavigationRequest, true);

    return () => {
      window.removeEventListener("resize", syncMobile);
      document.removeEventListener("click", handleNavigationRequest, true);
    };
  }, []);

  if (!mobile) return null;

  return (
    <>
      {open ? (
        <div
          className="atlas-mobile-full-access-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            className="atlas-mobile-full-access-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="All Atlas sections"
          >
            <div className="atlas-mobile-full-access-header">
              <div>
                <strong>Atlas</strong>
                <span>All sections</span>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <div className="atlas-mobile-full-access-grid">
              {sortedItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (navigateTo(item.key)) setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <style jsx global>{`
        @media (max-width: 900px) {
          .atlas-mobile-field-more-overlay {
            display: none !important;
          }

          .atlas-mobile-field-main,
          .atlas-command-dashboard,
          .atlas-mobile-dashboard-command {
            width: 100vw !important;
            max-width: 100vw !important;
            min-width: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 4px !important;
            padding-right: 4px !important;
            box-sizing: border-box !important;
          }

          .atlas-mobile-field-main > *,
          .atlas-mobile-field-main > div,
          .atlas-mobile-field-main > div > *,
          .atlas-command-dashboard > *,
          .atlas-mobile-dashboard-command > *,
          .atlas-command-dashboard .atlas-dashboard-layout-grid,
          .atlas-mobile-dashboard-command .atlas-dashboard-layout-grid,
          .atlas-command-dashboard .atlas-dashboard-layout-grid > *,
          .atlas-mobile-dashboard-command .atlas-dashboard-layout-grid > * {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            box-sizing: border-box !important;
          }

          .atlas-mobile-full-access-overlay {
            position: fixed !important;
            inset: 0 !important;
            z-index: 97000 !important;
            display: flex !important;
            align-items: flex-end !important;
            justify-content: center !important;
            padding: 8px 8px calc(76px + env(safe-area-inset-bottom)) !important;
            background: rgba(7, 24, 39, 0.54) !important;
            box-sizing: border-box !important;
          }

          .atlas-mobile-full-access-sheet {
            width: 100% !important;
            max-height: min(76dvh, 700px) !important;
            overflow-y: auto !important;
            padding: 14px !important;
            border: 1px solid rgba(11, 44, 67, 0.12) !important;
            border-radius: 18px !important;
            background: #ffffff !important;
            box-shadow: 0 20px 52px rgba(7, 24, 39, 0.3) !important;
            box-sizing: border-box !important;
          }

          .atlas-mobile-full-access-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 12px !important;
            margin-bottom: 12px !important;
          }

          .atlas-mobile-full-access-header > div {
            display: grid !important;
            gap: 2px !important;
          }

          .atlas-mobile-full-access-header strong {
            color: #0b2c43 !important;
            font-size: 18px !important;
          }

          .atlas-mobile-full-access-header span {
            color: #607184 !important;
            font-size: 12px !important;
            font-weight: 700 !important;
          }

          .atlas-mobile-full-access-header button {
            width: 42px !important;
            min-width: 42px !important;
            height: 42px !important;
            min-height: 42px !important;
            padding: 0 !important;
            border: 1px solid #d8e0e8 !important;
            border-radius: 11px !important;
            background: #ffffff !important;
            color: #0b2c43 !important;
            font: inherit !important;
            font-size: 24px !important;
            cursor: pointer !important;
          }

          .atlas-mobile-full-access-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .atlas-mobile-full-access-grid button {
            min-width: 0 !important;
            min-height: 48px !important;
            padding: 9px 10px !important;
            border: 1px solid #dce4ec !important;
            border-radius: 11px !important;
            background: #f8fafc !important;
            color: #0b2c43 !important;
            font: inherit !important;
            font-size: 12px !important;
            font-weight: 850 !important;
            line-height: 1.25 !important;
            text-align: left !important;
            overflow-wrap: anywhere !important;
            cursor: pointer !important;
          }
        }
      `}</style>
    </>
  );
}
