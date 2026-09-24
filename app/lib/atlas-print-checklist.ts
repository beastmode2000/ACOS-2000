export type PrintableChecklistItem = {
  text: string;
  completed?: boolean;
  detail?: string;
  children?: PrintableChecklistItem[];
};

export type PrintableChecklistSection = {
  title: string;
  items: PrintableChecklistItem[];
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character] || character);

function renderItem(item: PrintableChecklistItem, nested = false): string {
  return `<li class="item${nested ? " nested" : ""}">
    <span class="box" aria-hidden="true">${item.completed ? "✓" : ""}</span>
    <div><span class="item-title">${escapeHtml(item.text)}</span>${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}
      ${item.children?.length ? `<ul>${item.children.map((child) => renderItem(child, true)).join("")}</ul>` : ""}
    </div>
  </li>`;
}

export function printAtlasChecklist(title: string, subtitle: string, sections: PrintableChecklistSection[]): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  printWindow.opener = null;
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: letter; margin: .6in; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #172b3a; font: 12pt/1.4 Arial, sans-serif; }
      header { border-bottom: 2px solid #172b3a; padding-bottom: 12px; margin-bottom: 20px; }
      h1 { font-size: 20pt; line-height: 1.2; margin: 0 0 5px; }
      header p { color: #52616d; margin: 0; }
      section { margin: 0 0 22px; break-inside: avoid-page; }
      h2 { font-size: 14pt; margin: 0 0 9px; border-bottom: 1px solid #bac6ce; padding-bottom: 5px; }
      ul { margin: 0; padding: 0; list-style: none; }
      li.item { display: grid; grid-template-columns: 20px minmax(0,1fr); gap: 9px; padding: 6px 0; break-inside: avoid; }
      li.nested { padding: 4px 0; font-size: 11pt; }
      .item ul { margin: 5px 0 0 8px; }
      .box { display: block; width: 16px; height: 16px; border: 1.5px solid #172b3a; line-height: 13px; text-align: center; font-size: 12px; font-weight: bold; margin-top: 2px; }
      small { display: block; color: #52616d; font-size: 9pt; margin-top: 2px; }
      .empty { color: #52616d; font-style: italic; }
      .toolbar { margin: 12px 0 22px; }
      .toolbar button { padding: 8px 14px; font: inherit; cursor: pointer; }
      @media print { .toolbar { display: none; } }
    </style></head><body>
    <div class="toolbar"><button type="button" onclick="window.print()">Print</button></div>
    <header><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></header>
    ${sections.length ? sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2>${section.items.length ? `<ul>${section.items.map((item) => renderItem(item)).join("")}</ul>` : '<p class="empty">No checklist items.</p>'}</section>`).join("") : '<p class="empty">No work scheduled.</p>'}
    </body></html>`;
  printWindow.document.open();
  printWindow.document.write(page);
  printWindow.document.close();
  printWindow.setTimeout(() => { printWindow.focus(); printWindow.print(); }, 200);
  return true;
}
