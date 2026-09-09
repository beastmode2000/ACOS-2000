"use client";

import { useEffect, useMemo, useState } from "react";

type MobileNavItem = {
  label: string;
  key: string;
};

const PRIMARY_KEYS = ["dashboard", "work", "assets", "calendar"] as const;

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function visible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function isOwnMobileControl(element: Element) {
  return Boolean(element.closest(".atlas-mobile-shell-nav, .atlas-mobile-shell-overlay"));
}

function sidebarRoot() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("aside, nav"))
    .filter((element) => !isOwnMobileControl(element))
    .map((element) => {
      const labels = Array.from(element.querySelectorAll<HTMLElement>("button, a"))
        .map((control) => normalized(control.textContent))
        .filter(Boolean);
      const required = ["dashboard", "work", "assets", "calendar", "locations"];
      const score = required.filter((label) => labels.includes(label)).length * 100 + labels.length;
      return { element, score };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.score >= 400 ? candidates[0].element : null;
}

function navItems() {
  const root = sidebarRoot();
  if (!root) return [] as MobileNavItem[];

  const seen = new Set<string>();
  const items: MobileNavItem[] = [];

  Array.from(root.querySelectorAll<HTMLElement>("button, a")).forEach((control) => {
    if (isOwnMobileControl(control)) return;
    const label = String(control.textContent || "").trim().replace(/\s+/g, " ");
    const key = normalized(label);
    if (!label || !key || key === "menu" || seen.has(key)) return;
    seen.add(key);
    items.push({ label, key });
  });

  return items;
}

function clickNav(key: string) {
  const root = sidebarRoot();
  if (!root) return false;

  const control = Array.from(root.querySelectorAll<HTMLElement>("button, a")).find(
    (candidate) => !isOwnMobileControl(candidate) && normalized(candidate.textContent) === normalized(key),
  );

  if (!control) return false;
  control.click();
  return true;
}

function currentScreenKey() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2"))
    .find((node) => visible(node));
  return normalized(heading?.textContent);
}

function normalizeMobileDom() {
  if (window.innerWidth > 900) return;

  document.documentElement.classList.add("atlas-mobile-shell-active");
  document.body.classList.add("atlas-mobile-shell-active");

  const sidebar = sidebarRoot();
  if (sidebar) sidebar.classList.add("atlas-mobile-shell-sidebar-hidden");

  Array.from(document.querySelectorAll<HTMLElement>("main")).forEach((main) => {
    if (!visible(main)) return;
    main.classList.add("atlas-mobile-shell-main");
  });

  Array.from(document.querySelectorAll<HTMLElement>("main .atlas-page")).forEach((page) => {
    page.classList.add("atlas-mobile-shell-page");
  });

  Array.from(document.querySelectorAll<HTMLButtonElement>("button")).forEach((button) => {
    if (isOwnMobileControl(button)) return;
    if (String(button.textContent || "").trim() !== "+") return;
    const style = window.getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    if (style.position !== "fixed" && style.position !== "absolute" && rect.width < 64 && rect.height < 64) return;
    button.classList.add("atlas-mobile-shell-fab");
    button.style.setProperty("position", "fixed", "important");
    button.style.setProperty("left", "auto", "important");
    button.style.setProperty("right", "12px", "important");
    button.style.setProperty("bottom", "calc(78px + env(safe-area-inset-bottom))", "important");
    button.style.setProperty("width", "42px", "important");
    button.style.setProperty("max-width", "42px", "important");
    button.style.setProperty("min-width", "42px", "important");
    button.style.setProperty("height", "42px", "important");
    button.style.setProperty("max-height", "42px", "important");
    button.style.setProperty("min-height", "42px", "important");
    button.style.setProperty("padding", "0", "important");
    button.style.setProperty("border-radius", "999px", "important");
    button.style.setProperty("font-size", "20px", "important");
    button.style.setProperty("line-height", "1", "important");
  });
}

export default function AtlasMobileShell() {
  const [mobile, setMobile] = useState(false);
  const [screen, setScreen] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState<MobileNavItem[]>([]);

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const isMobile = window.innerWidth <= 900;
      setMobile(isMobile);
      if (!isMobile) {
        setMenuOpen(false);
        document.documentElement.classList.remove("atlas-mobile-shell-active");
        document.body.classList.remove("atlas-mobile-shell-active");
        return;
      }

      normalizeMobileDom();
      setScreen(currentScreenKey());
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const primary = useMemo(() => {
    const map = new Map(navItems().map((item) => [item.key, item]));
    return PRIMARY_KEYS.map((key) => map.get(key) || { label: key[0].toUpperCase() + key.slice(1), key });
  }, [screen, mobile]);

  const openMenu = () => {
    setItems(navItems());
    setMenuOpen(true);
  };

  if (!mobile) return null;

  return (
    <>
      <nav className="atlas-mobile-shell-nav" aria-label="Atlas mobile navigation">
        {primary.map((item) => (
          <button
            key={item.key}
            type="button"
            data-active={screen === item.key ? "true" : "false"}
            onClick={() => {
              setMenuOpen(false);
              clickNav(item.key);
            }}
          >
            {item.label}
          </button>
        ))}
        <button type="button" data-active={PRIMARY_KEYS.includes(screen as (typeof PRIMARY_KEYS)[number]) ? "false" : "true"} onClick={openMenu}>
          More
        </button>
      </nav>

      {menuOpen ? (
        <div className="atlas-mobile-shell-overlay" onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)}>
          <section className="atlas-mobile-shell-sheet" role="dialog" aria-modal="true" aria-label="All Atlas sections">
            <header>
              <div>
                <strong>Atlas</strong>
                <span>All sections</span>
              </div>
              <button type="button" aria-label="Close" onClick={() => setMenuOpen(false)}>×</button>
            </header>
            <div className="atlas-mobile-shell-grid">
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (clickNav(item.key)) setMenuOpen(false);
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
          html.atlas-mobile-shell-active,
          body.atlas-mobile-shell-active {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          body.atlas-mobile-shell-active {
            padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important;
          }

          .atlas-mobile-shell-sidebar-hidden {
            display: none !important;
          }

          .atlas-mobile-shell-main {
            width: 100vw !important;
            max-width: 100vw !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding-left: 4px !important;
            padding-right: 4px !important;
            box-sizing: border-box !important;
            transform: none !important;
          }

          .atlas-mobile-shell-main > *,
          .atlas-mobile-shell-page,
          .atlas-mobile-shell-main .atlas-command-dashboard,
          .atlas-mobile-shell-main .atlas-dashboard-layout-grid,
          .atlas-mobile-shell-main section,
          .atlas-mobile-shell-main article,
          .atlas-mobile-shell-main details {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            box-sizing: border-box !important;
          }

          .atlas-mobile-shell-page {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .atlas-mobile-shell-fab {
            z-index: 94990 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .atlas-mobile-shell-nav {
            position: fixed !important;
            left: 4px !important;
            right: 4px !important;
            bottom: calc(4px + env(safe-area-inset-bottom)) !important;
            z-index: 95000 !important;
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 3px !important;
            padding: 4px !important;
            border: 1px solid rgba(11, 44, 67, 0.14) !important;
            border-radius: 14px !important;
            background: rgba(255, 255, 255, 0.98) !important;
            box-shadow: 0 8px 24px rgba(7, 24, 39, 0.18) !important;
            backdrop-filter: blur(12px) !important;
          }

          .atlas-mobile-shell-nav button {
            min-width: 0 !important;
            min-height: 46px !important;
            padding: 4px 2px !important;
            border: 0 !important;
            border-radius: 9px !important;
            background: transparent !important;
            color: #607184 !important;
            font: inherit !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            box-shadow: none !important;
          }

          .atlas-mobile-shell-nav button[data-active="true"] {
            background: #0b2c43 !important;
            color: #ffffff !important;
          }

          .atlas-mobile-shell-overlay {
            position: fixed !important;
            inset: 0 !important;
            z-index: 96000 !important;
            display: flex !important;
            align-items: flex-end !important;
            justify-content: center !important;
            padding: 8px 8px calc(72px + env(safe-area-inset-bottom)) !important;
            background: rgba(7, 24, 39, 0.52) !important;
          }

          .atlas-mobile-shell-sheet {
            width: 100% !important;
            max-height: 76dvh !important;
            overflow-y: auto !important;
            padding: 12px !important;
            border: 1px solid #dce4ec !important;
            border-radius: 16px !important;
            background: #ffffff !important;
            box-shadow: 0 18px 50px rgba(7, 24, 39, 0.3) !important;
          }

          .atlas-mobile-shell-sheet header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
            margin-bottom: 10px !important;
          }

          .atlas-mobile-shell-sheet header > div {
            display: grid !important;
            gap: 2px !important;
          }

          .atlas-mobile-shell-sheet header strong {
            color: #0b2c43 !important;
            font-size: 18px !important;
          }

          .atlas-mobile-shell-sheet header span {
            color: #607184 !important;
            font-size: 12px !important;
            font-weight: 700 !important;
          }

          .atlas-mobile-shell-sheet header button {
            width: 38px !important;
            min-width: 38px !important;
            height: 38px !important;
            min-height: 38px !important;
            padding: 0 !important;
            border: 1px solid #d8e0e8 !important;
            border-radius: 10px !important;
            background: #ffffff !important;
            color: #0b2c43 !important;
            font-size: 22px !important;
          }

          .atlas-mobile-shell-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }

          .atlas-mobile-shell-grid button {
            min-height: 46px !important;
            padding: 8px 9px !important;
            border: 1px solid #dce4ec !important;
            border-radius: 10px !important;
            background: #f8fafc !important;
            color: #0b2c43 !important;
            font: inherit !important;
            font-size: 12px !important;
            font-weight: 800 !important;
            text-align: left !important;
            overflow-wrap: anywhere !important;
          }
        }
      `}</style>
    </>
  );
}
