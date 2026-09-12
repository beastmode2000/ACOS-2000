"use client";

export default function AtlasWorkListPolish() {
  return (
    <style jsx global>{`
      .atlas-work-polish-root .atlas-work-list-pane {
        background: #ffffff !important;
      }

      .atlas-work-polish-root .atlas-work-row {
        min-height: 56px !important;
        padding: 8px 9px !important;
        gap: 8px !important;
        align-items: center !important;
        border: 1px solid transparent !important;
        border-bottom-color: #edf1f5 !important;
        border-radius: 0 !important;
        background: #ffffff !important;
      }

      .atlas-work-polish-root .atlas-work-row:hover {
        background: #f8fafc !important;
      }

      .atlas-work-polish-root .atlas-work-row:has(.atlas-work-row-main[aria-pressed="true"]),
      .atlas-work-polish-root .atlas-work-row:has(.atlas-work-row-main[aria-current="true"]) {
        background: #f3f7fa !important;
        border-left: 3px solid #b79132 !important;
        padding-left: 7px !important;
      }

      .atlas-work-polish-root .atlas-work-row-main {
        min-width: 0 !important;
        display: grid !important;
        gap: 3px !important;
        align-content: center !important;
        text-align: left !important;
      }

      .atlas-work-polish-root .atlas-work-row-main strong {
        display: block !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        font-size: 13px !important;
        line-height: 1.25 !important;
        font-weight: 650 !important;
        color: #172b3a !important;
      }

      .atlas-work-polish-root .atlas-work-row-main span:not(.atlas-work-weekly-label) {
        display: block !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        margin-top: 0 !important;
        font-size: 10px !important;
        line-height: 1.25 !important;
        color: #6b7c8c !important;
      }

      .atlas-work-polish-root .atlas-work-row > input[type="checkbox"] {
        width: 16px !important;
        height: 16px !important;
        flex: 0 0 16px !important;
        margin: 0 !important;
      }

      .atlas-work-polish-root .atlas-work-row-assignee,
      .atlas-work-polish-root .atlas-work-row-date {
        min-height: 28px !important;
        height: 28px !important;
        max-width: 104px !important;
        padding: 3px 6px !important;
        border-radius: 7px !important;
        font-size: 10px !important;
        background: #ffffff !important;
      }

      .atlas-work-polish-root .atlas-work-group-header {
        min-height: 34px !important;
        padding: 7px 9px !important;
        margin-top: 4px !important;
        border-top: 1px solid #e7edf2 !important;
        border-bottom: 1px solid #e7edf2 !important;
        background: #f8fafc !important;
        border-radius: 0 !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        letter-spacing: .02em !important;
        text-transform: uppercase !important;
        color: #526273 !important;
      }

      .atlas-work-polish-root .atlas-work-weekly-label {
        margin-top: 1px !important;
        padding: 1px 6px !important;
        font-size: 9px !important;
      }

      @media (max-width: 900px) {
        .atlas-work-polish-root .atlas-work-row {
          min-height: 54px !important;
          padding: 8px !important;
        }

        .atlas-work-polish-root .atlas-work-row-assignee,
        .atlas-work-polish-root .atlas-work-row-date {
          max-width: 92px !important;
        }
      }
    `}</style>
  );
}
