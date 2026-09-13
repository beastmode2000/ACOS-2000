"use client";

export default function AtlasWorkListPolish() {
  return (
    <style jsx global>{`
      .atlas-work-polish-root .atlas-work-list-pane {
        background: #ffffff !important;
      }

      .atlas-work-polish-root .atlas-work-row {
        min-height: 44px !important;
        padding: 5px 7px !important;
        gap: 6px !important;
        align-items: center !important;
        border: 0 !important;
        border-bottom: 1px solid #e7edf2 !important;
        border-radius: 0 !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }

      .atlas-work-polish-root .atlas-work-row:hover {
        background: #f8fafc !important;
      }

      .atlas-work-polish-root .atlas-work-row:focus-within {
        background: #f5f8fb !important;
      }

      .atlas-work-polish-root .atlas-work-row:has(.atlas-work-row-main[aria-pressed="true"]),
      .atlas-work-polish-root .atlas-work-row:has(.atlas-work-row-main[aria-current="true"]) {
        background: #f3f7fa !important;
        border-left: 3px solid #b79132 !important;
        padding-left: 4px !important;
      }

      .atlas-work-polish-root .atlas-work-row-main {
        min-width: 0 !important;
        display: grid !important;
        gap: 1px !important;
        align-content: center !important;
        text-align: left !important;
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
      }

      .atlas-work-polish-root .atlas-work-row-main strong {
        display: block !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        font-size: 12.5px !important;
        line-height: 1.2 !important;
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
        font-size: 9.5px !important;
        line-height: 1.15 !important;
        color: #718096 !important;
      }

      .atlas-work-polish-root .atlas-work-row > input[type="checkbox"] {
        width: 14px !important;
        height: 14px !important;
        flex: 0 0 14px !important;
        margin: 0 !important;
      }

      .atlas-work-polish-root .atlas-work-row-assignee,
      .atlas-work-polish-root .atlas-work-row-date {
        min-height: 24px !important;
        height: 24px !important;
        max-width: 88px !important;
        padding: 1px 3px !important;
        border: 1px solid transparent !important;
        border-radius: 5px !important;
        font-size: 9px !important;
        color: #607080 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .atlas-work-polish-root .atlas-work-row:hover .atlas-work-row-assignee,
      .atlas-work-polish-root .atlas-work-row:hover .atlas-work-row-date,
      .atlas-work-polish-root .atlas-work-row-assignee:focus,
      .atlas-work-polish-root .atlas-work-row-date:focus {
        border-color: #d7e0e8 !important;
        background: #ffffff !important;
      }

      .atlas-work-polish-root .atlas-work-group-header {
        min-height: 28px !important;
        padding: 5px 7px !important;
        margin: 7px 0 0 !important;
        border: 0 !important;
        border-bottom: 1px solid #dfe7ee !important;
        background: #ffffff !important;
        border-radius: 0 !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        letter-spacing: .035em !important;
        text-transform: uppercase !important;
        color: #526273 !important;
      }

      .atlas-work-polish-root .atlas-work-weekly-label {
        margin-top: 1px !important;
        padding: 1px 5px !important;
        border: 0 !important;
        background: transparent !important;
        font-size: 8.5px !important;
        color: #718096 !important;
      }

      @media (max-width: 900px) {
        .atlas-work-polish-root .atlas-work-row {
          min-height: 46px !important;
          padding: 6px !important;
        }

        .atlas-work-polish-root .atlas-work-row-assignee,
        .atlas-work-polish-root .atlas-work-row-date {
          max-width: 80px !important;
        }
      }
    `}</style>
  );
}
