"use client";

import { useEffect, useMemo, useState } from "react";

type NavItem = {
  label: string;
  aliases: string[];
};

const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", aliases: ["dashboard"] },
  { label: "Work", aliases: ["work"] },
  { label: "Assets", aliases: ["assets"] },
  { label: "Calendar", aliases: ["calendar"] },
];

const MORE_NAV: NavItem[] = [
  { label: "Locations", aliases: ["locations"] },
  { label: "Notes", aliases: ["notes"] },
  { label: "Manuals", aliases: ["manuals"] },
  { label: "Team", aliases: ["team"] },
  { label: "Vendors", aliases: ["vendors"] },
  { label: "Contacts", aliases: ["contacts"] },
  { label: "Owner Report", aliases: ["owner report"] },
  { label: "Garage", aliases: ["garage / vehicles", "garage", "vehicles"] },
  { label: "Pool & Spa", aliases: ["pool & spa", "pool and spa"] },
  { label: "Dock", aliases: ["dock & waterfront", "dock & marine", "dock and marine"] },
  { label: "Landscape", aliases: ["landscape", "landscaping"] },
  { label: "Shop & Tools", aliases: ["shop & tools", "shop and tools"] },
  { label: "Ask Atlas", aliases: ["ask atlas", "assistant"] },
];

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function visibleScreenTitle() {
  const headings = Array.from(
    document.querySelectorAll<HTMLElement>("main h1, main h2"),
  ).filter(isVisible);

  return normalized(headings[0]?.textContent);
}

function navigationControls() {
  const scoped = Array.from(
    document.querySelectorAll<HTMLElement>("aside button, aside a, nav button, nav a"),
  );

  if (scoped.length) return scoped;

  return Array.from(document.querySelectorAll<HTMLElement>("button, a"));
}

function findNavigationControl(item: NavItem) {
  return navigationControls().find((control) => {
    const text = normalized(control.textContent);
    return item.aliases.some((alias) => text === normalized(alias));
  });
}

function navigateTo(item: NavItem) {
  const control = findNavigationControl(item);
  if (!control) return false;

  control.click();
  return true;
}

function markMobileShell() {
  if (window.innerWidth > 900) return;

  const all = Array.from(
    document.querySelectorAll<HTMLElement>("aside, nav, div, section"),
  );

  const sidebarCandidates = all.filter((element) => {
    if (!isVisible(element)) return false;

    const rect = element.getBoundingClientRect();
    if (rect.left > 48 || rect.width < 180 || rect.width > 430 || rect.height < 300) {
      return false;
    }

    const text = normalized(element.textContent);
    const score = ["dashboard", "work", "calendar", "assets", "locations"]
      .filter((label) => text.includes(label)).length;

    return score >= 4;
  });

  sidebarCandidates.sort((a, b) => {
    const aArea = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
    const bArea = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
    return aArea - bArea;
  });

  const sidebar = sidebarCandidates[0] || null;

  if (sidebar) {
    sidebar.classList.add("atlas-mobile-field-sidebar-hidden");
    sidebar.parentElement?.classList.add("atlas-mobile-field-shell");
  }

  for (const main of Array.from(document.querySelectorAll<HTMLElement>("main"))) {
    if (!isVisible(main)) continue;
    main.classList.add("atlas-mobile-field-main");
  }

  for (const search of Array.from(
    document.querySelectorAll<HTMLInputElement>('main input[type="search"]'),
  )) {
    if (isVisible(search)) {
      search.classList.add("atlas-mobile-field-search");
    }
  }

  for (const dialog of Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"]'),
  )) {
    if (isVisible(dialog)) {
      dialog.classList.add("atlas-mobile-field-dialog");
    }
  }
}

function storageKey(screen: string) {
  return `atlas-mobile-scroll:${screen || "unknown"}`;
}

export default function AtlasMobileFieldPolish() {
  const [mobile, setMobile] = useState(false);
  const [screen, setScreen] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [availableMore, setAvailableMore] = useState<NavItem[]>([]);

  const primaryActive = useMemo(() => {
    return PRIMARY_NAV.find((item) =>
      item.aliases.some((alias) => screen === normalized(alias)),
    )?.label;
  }, [screen]);

  useEffect(() => {
    let frame = 0;
    let previousScreen = "";

    const apply = () => {
      frame = 0;

      const isMobileNow = window.innerWidth <= 900;
      setMobile(isMobileNow);

      if (!isMobileNow) {
        setMoreOpen(false);
        return;
      }

      markMobileShell();

      const nextScreen = visibleScreenTitle();

      if (nextScreen && nextScreen !== previousScreen) {
        if (previousScreen) {
          window.sessionStorage.setItem(storageKey(previousScreen), String(window.scrollY));
        }

        previousScreen = nextScreen;
        setScreen(nextScreen);

        const saved = Number(window.sessionStorage.getItem(storageKey(nextScreen)) || "0");
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: Number.isFinite(saved) ? saved : 0, behavior: "auto" });
        });
      } else if (nextScreen) {
        setScreen(nextScreen);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden"],
    });

    const saveScroll = () => {
      if (previousScreen && window.innerWidth <= 900) {
        window.sessionStorage.setItem(storageKey(previousScreen), String(window.scrollY));
      }
    };

    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", saveScroll, { passive: true });
    window.addEventListener("popstate", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", saveScroll);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const openMore = () => {
    const available = MORE_NAV.filter((item) => Boolean(findNavigationControl(item)));
    setAvailableMore(available);
    setMoreOpen(true);
  };

  if (!mobile) return null;

  return (
    <>
      <nav className="atlas-mobile-field-bottom-nav" aria-label="Atlas mobile navigation">
        {PRIMARY_NAV.map((item) => {
          const active = primaryActive === item.label;

          return (
            <button
              key={item.label}
              type="button"
              data-active={active ? "true" : "false"}
              onClick={() => {
                setMoreOpen(false);
                navigateTo(item);
              }}
            >
              {item.label}
            </button>
          );
        })}

        <button
          type="button"
          data-active={!primaryActive ? "true" : "false"}
          onClick={openMore}
        >
          More
        </button>
      </nav>

      {moreOpen ? (
        <div
          className="atlas-mobile-field-more-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMoreOpen(false);
          }}
        >
          <div className="atlas-mobile-field-more-sheet" role="dialog" aria-modal="true" aria-label="More Atlas sections">
            <div className="atlas-mobile-field-more-header">
              <strong>More</strong>
              <button type="button" aria-label="Close" onClick={() => setMoreOpen(false)}>
                ×
              </button>
            </div>

            <div className="atlas-mobile-field-more-grid">
              {availableMore.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    navigateTo(item);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @media (max-width: 900px) {
          html,
          body {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          body {
            padding-bottom: calc(76px + env(safe-area-inset-bottom)) !important;
          }

          .atlas-mobile-field-sidebar-hidden {
            display: none !important;
          }

          .atlas-mobile-field-shell {
            display: block !important;
            grid-template-columns: minmax(0, 1fr) !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .atlas-mobile-field-main,
          .atlas-command-dashboard,
          .atlas-mobile-dashboard-command {
            position: relative !important;
            left: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 6px !important;
            padding-right: 6px !important;
            box-sizing: border-box !important;
            transform: none !important;
          }

          .atlas-mobile-field-main > *,
          .atlas-command-dashboard > *,
          .atlas-mobile-dashboard-command > * {
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .atlas-mobile-field-main h1,
          .atlas-mobile-field-main h2 {
            margin-top: 4px !important;
            margin-bottom: 8px !important;
            line-height: 1.1 !important;
          }

          .atlas-mobile-field-main section,
          .atlas-mobile-field-main article {
            max-width: 100% !important;
          }

          .atlas-mobile-field-main button,
          .atlas-mobile-field-main [role="button"] {
            min-height: 38px;
          }

          .atlas-mobile-field-search {
            position: sticky !important;
            top: 4px !important;
            z-index: 30 !important;
            width: 100% !important;
            min-height: 40px !important;
            background: #fff !important;
            box-sizing: border-box !important;
          }

          .atlas-mobile-field-dialog {
            width: calc(100vw - 10px) !important;
            max-width: calc(100vw - 10px) !important;
            max-height: calc(100dvh - 14px) !important;
            border-radius: 14px !important;
          }

          .atlas-mobile-field-bottom-nav {
            position: fixed !important;
            left: 6px !important;
            right: 6px !important;
            bottom: calc(6px + env(safe-area-inset-bottom)) !important;
            z-index: 95000 !important;
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 4px !important;
            min-height: 58px !important;
            padding: 5px !important;
            border: 1px solid rgba(11, 44, 67, 0.14) !important;
            border-radius: 15px !important;
            background: rgba(255, 255, 255, 0.97) !important;
            box-shadow: 0 10px 28px rgba(7, 24, 39, 0.2) !important;
            backdrop-filter: blur(14px) !important;
            box-sizing: border-box !important;
          }

          .atlas-mobile-field-bottom-nav button {
            min-width: 0 !important;
            min-height: 48px !important;
            padding: 5px 2px !important;
            border: 0 !important;
            border-radius: 10px !important;
            background: transparent !important;
            color: #607184 !important;
            font: inherit !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            cursor: pointer !important;
            box-shadow: none !important;
          }

          .atlas-mobile-field-bottom-nav button[data-active="true"] {
            background: #0b2c43 !important;
            color: #fff !important;
          }

          .atlas-mobile-field-more-overlay {
            position: fixed !important;
            inset: 0 !important;
            z-index: 96000 !important;
            display: flex !important;
            align-items: flex-end !important;
            justify-content: center !important;
            padding: 8px 8px calc(76px + env(safe-area-inset-bottom)) !important;
            background: rgba(7, 24, 39, 0.5) !important;
          }

          .atlas-mobile-field-more-sheet {
            width: 100% !important;
            max-height: min(70dvh, 620px) !important;
            overflow-y: auto !important;
            display: grid !important;
            gap: 10px !important;
            padding: 12px !important;
            border-radius: 16px !important;
            background: #fff !important;
            box-shadow: 0 18px 48px rgba(7, 24, 39, 0.28) !important;
            box-sizing: border-box !important;
          }

          .atlas-mobile-field-more-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
          }

          .atlas-mobile-field-more-header strong {
            color: #0b2c43 !important;
            font-size: 16px !important;
          }

          .atlas-mobile-field-more-header button {
            width: 40px !important;
            min-width: 40px !important;
            height: 40px !important;
            min-height: 40px !important;
            padding: 0 !important;
            border: 1px solid #d8e0e8 !important;
            border-radius: 10px !important;
            background: #fff !important;
            color: #0b2c43 !important;
            font-size: 22px !important;
          }

          .atlas-mobile-field-more-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }

          .atlas-mobile-field-more-grid button {
            min-height: 46px !important;
            padding: 8px !important;
            border: 1px solid #dce4ec !important;
            border-radius: 10px !important;
            background: #f8fafc !important;
            color: #0b2c43 !important;
            font: inherit !important;
            font-size: 12px !important;
            font-weight: 800 !important;
            text-align: left !important;
          }

          .atlas-mobile-dashboard-fab,
          .atlas-week-wrap-launch,
          .atlas-day-off-floating-wrap,
          .atlas-shared-list-launch {
            bottom: calc(82px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>
    </>
  );
}
