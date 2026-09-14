"use client";

import { useEffect } from "react";

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalized(value: unknown) {
  return clean(value).toLowerCase();
}

function findNativePropertySelect() {
  return document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]');
}

function findSidebarHeading(label: string) {
  const wanted = normalized(label);
  return Array.from(document.querySelectorAll<HTMLElement>("aside *, nav *, [role='navigation'] *"))
    .find((element) => normalized(element.textContent) === wanted && element.children.length === 0) || null;
}

function simplifyAtlasTitle() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("header *, main > div *, body > div *"));
  for (const element of candidates) {
    if (element.children.length) continue;
    const text = clean(element.textContent);
    const match = text.match(/^Atlas\s*\/\s*(2000|6855|3661|Hangar)$/i);
    if (!match) continue;
    element.textContent = `Atlas ${match[1]}`;
    element.classList.add("atlas-topbar-title-clean");
  }
}

function syncProxyOptions(nativeSelect: HTMLSelectElement, proxy: HTMLSelectElement) {
  const snapshot = Array.from(nativeSelect.options).map((option) => `${option.value}|${option.textContent || ""}`).join("||");
  if (proxy.dataset.optionsSnapshot !== snapshot) {
    proxy.innerHTML = "";
    for (const option of Array.from(nativeSelect.options)) {
      const clone = document.createElement("option");
      clone.value = option.value;
      clone.textContent = option.textContent;
      clone.disabled = option.disabled;
      proxy.appendChild(clone);
    }
    proxy.dataset.optionsSnapshot = snapshot;
  }
  if (proxy.value !== nativeSelect.value) proxy.value = nativeSelect.value;
}

function mountPropertyProxy() {
  const nativeSelect = findNativePropertySelect();
  const moreToolsHeading = findSidebarHeading("More Tools");
  if (!nativeSelect || !moreToolsHeading) return;

  nativeSelect.classList.add("atlas-topbar-native-property-hidden");

  const sidebar = moreToolsHeading.closest<HTMLElement>("aside, nav, [role='navigation']") || moreToolsHeading.parentElement;
  if (!sidebar) return;

  let host = sidebar.querySelector<HTMLElement>("[data-atlas-sidebar-property-switcher]");
  if (!host) {
    host = document.createElement("div");
    host.dataset.atlasSidebarPropertySwitcher = "true";
    host.className = "atlas-sidebar-property-switcher";

    const proxy = document.createElement("select");
    proxy.className = "atlas-sidebar-property-select";
    proxy.setAttribute("aria-label", "Change active property");
    proxy.addEventListener("change", () => {
      const current = findNativePropertySelect();
      if (!current) return;
      current.value = proxy.value;
      current.dispatchEvent(new Event("change", { bubbles: true }));
    });

    host.appendChild(proxy);
    moreToolsHeading.insertAdjacentElement("afterend", host);
  } else if (host.previousElementSibling !== moreToolsHeading) {
    moreToolsHeading.insertAdjacentElement("afterend", host);
  }

  const proxy = host.querySelector<HTMLSelectElement>("select");
  if (proxy) syncProxyOptions(nativeSelect, proxy);
}

export default function AtlasTopBarPropertyPolish() {
  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      simplifyAtlasTitle();
      mountPropertyProxy();
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
    document.addEventListener("change", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("change", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-topbar-native-property-hidden {
        display: none !important;
      }

      .atlas-sidebar-property-switcher {
        margin: 3px 10px 7px !important;
        display: block !important;
        opacity: 0.72 !important;
      }

      .atlas-sidebar-property-switcher:hover,
      .atlas-sidebar-property-switcher:focus-within {
        opacity: 1 !important;
      }

      .atlas-sidebar-property-select {
        width: 100% !important;
        min-height: 28px !important;
        padding: 4px 24px 4px 8px !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        border-radius: 6px !important;
        background: rgba(255, 255, 255, 0.045) !important;
        color: rgba(255, 255, 255, 0.8) !important;
        font: inherit !important;
        font-size: 10px !important;
        font-weight: 600 !important;
        outline: none !important;
        cursor: pointer !important;
      }

      .atlas-sidebar-property-select option {
        color: #0a2841 !important;
        background: #ffffff !important;
      }

      .atlas-topbar-title-clean {
        white-space: nowrap !important;
      }

      @media (max-width: 900px) {
        .atlas-topbar-native-property-hidden {
          display: revert !important;
        }

        .atlas-sidebar-property-switcher {
          display: none !important;
        }
      }
    `}</style>
  );
}
