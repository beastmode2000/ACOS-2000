"use client";

export default function AtlasSidebarScrollbarPolish() {
  return (
    <style jsx global>{`
      @media (min-width: 900px) {
        /*
         * The desktop sidebar is the only vertical scroller for Atlas navigation.
         * Keep its viewport sizing deterministic so expanding sections cannot make
         * the last navigation groups fall outside the reachable scroll range.
         */
        .atlas-desktop-sidebar {
          top: 0 !important;
          bottom: auto !important;
          height: 100dvh !important;
          min-height: 0 !important;
          max-height: 100dvh !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-y: contain !important;
          scrollbar-gutter: stable !important;
          scroll-padding-bottom: 52px !important;
          padding-bottom: 52px !important;
          -webkit-overflow-scrolling: touch;
        }

        /*
         * Do not allow flex sizing to shrink the navigation itself. The sidebar
         * scrolls the full natural height of the nav, including More Tools.
         */
        .atlas-desktop-sidebar > .atlas-brand-shell,
        .atlas-desktop-sidebar > .atlas-sidebar-toggle {
          flex: 0 0 auto !important;
        }

        .atlas-desktop-sidebar > nav {
          flex: 0 0 auto !important;
          min-height: max-content !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          padding-bottom: 12px !important;
        }

        .atlas-desktop-sidebar > nav > * {
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
        }

        .atlas-desktop-sidebar::-webkit-scrollbar {
          width: 8px;
        }

        .atlas-desktop-sidebar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.24);
          border-radius: 999px;
        }

        .atlas-desktop-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }
      }
    `}</style>
  );
}
