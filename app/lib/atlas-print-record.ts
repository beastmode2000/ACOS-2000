type PrintField = { label: string; value: string };

type PrintableAsset = {
  title: string;
  property: string;
  photoUrl?: string;
  fields: PrintField[];
  vehicleFields?: PrintField[];
  notes?: string;
  documents?: string[];
  detailsUnavailable?: boolean;
};

type PrintableWorkOrder = {
  title: string;
  fields: PrintField[];
  description?: string;
  checklist: Array<{ text: string; completed?: boolean }>;
};

const escapeHtml = (value: string) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] || character);

const safeImage = (value: string) => /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,|blob:)/i.test(value) ? value : "";

export function openAtlasRecordPrint(): Window | null {
  const target = window.open("", "_blank");
  if (!target) return null;
  target.opener = null;
  target.document.title = "Preparing printable record";
  target.document.body.textContent = "Preparing printable record…";
  return target;
}

function printPage(target: Window, title: string, body: string, waitForImage = false) {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: letter; margin: .55in .65in; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #172b3a; background: #fff; font: 11pt/1.42 Arial, sans-serif; }
      h1 { margin: 0 0 5px; font-size: 21pt; line-height: 1.18; }
      h2 { font-size: 13pt; margin: 17px 0 9px; padding-bottom: 5px; border-bottom: 1px solid #bdc9d2; }
      header { border-bottom: 2px solid #172b3a; padding-bottom: 12px; margin-bottom: 16px; }
      .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 13px; }
      .brand img { width: 72px; height: 72px; object-fit: contain; object-position: left center; }
      .company { display: flex; align-items: center; gap: 8px; margin-top: 22px; padding-top: 7px; border-top: 1px solid #bdc9d2; color: #556675; font-size: 8pt; break-inside: avoid; }
      .company img { width: 55px; height: 34px; object-fit: contain; }
      .sub { color: #556675; font-size: 10pt; }
      .toolbar { padding: 12px 0 18px; display: flex; gap: 10px; align-items: center; }
      button { padding: 8px 13px; cursor: pointer; font: inherit; }
      .fields { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px 18px; }
      .field { break-inside: avoid; border-bottom: 1px solid #e0e6eb; padding: 4px 0 7px; }
      .field b { display: block; color: #526577; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .03em; }
      .field span { display: block; font-weight: 700; overflow-wrap: anywhere; }
      .plate { font-size: 16pt; letter-spacing: .04em; }
      .hero { width: 100%; max-height: 2.8in; object-fit: contain; object-position: left center; margin-bottom: 12px; }
      .copy { white-space: pre-wrap; overflow-wrap: anywhere; }
      .warning { color: #80510f; font-size: 9pt; }
      .checklist { list-style: none; padding: 0; margin: 0; }
      .checklist li { display: grid; grid-template-columns: 20px 1fr; gap: 9px; padding: 5px 0; break-inside: avoid; }
      .box { border: 1.5px solid #172b3a; width: 16px; height: 16px; display: inline-block; line-height: 13px; text-align: center; font-size: 11px; }
      .lines { height: 74px; background: repeating-linear-gradient(to bottom, transparent 0 25px, #bdc9d2 26px); }
      .signoff { display: grid; grid-template-columns: 2fr 1fr; gap: 25px; margin-top: 22px; }
      .signoff span { border-top: 1px solid #172b3a; padding-top: 4px; font-size: 9pt; }
      section { break-inside: avoid-page; }
      @media print { .toolbar { display: none; } }
    </style></head><body>
    <div class="toolbar"><button type="button" onclick="window.print()">Print / Save as PDF</button><small>Choose “Save as PDF” as the printer destination to email a copy.</small></div>
    <div class="brand"><img src="${escapeHtml(`${window.location.origin}/atlas-logo.png`)}" alt="Atlas logo"></div>
    ${body}
    <footer class="company"><img src="${escapeHtml(`${window.location.origin}/arctic-asset-logo.png`)}" alt="Arctic Asset Management logo"><span>Prepared by Arctic Asset Management</span></footer>
    </body></html>`;
  target.document.open();
  target.document.write(page);
  target.document.close();
  let printed = false;
  const print = () => {
    if (printed || target.closed) return;
    printed = true;
    target.focus();
    target.print();
  };
  const pendingImages = Array.from(target.document.images).filter((image) => !image.complete);
  if (pendingImages.length) {
    let remaining = pendingImages.length;
    const ready = () => { remaining -= 1; if (!remaining) target.setTimeout(print, 150); };
    pendingImages.forEach((image) => {
      image.addEventListener("load", ready, { once: true });
      image.addEventListener("error", ready, { once: true });
    });
    target.setTimeout(print, waitForImage ? 4000 : 2000);
    return;
  }
  target.setTimeout(print, 200);
}

function renderFields(fields: PrintField[]) {
  return `<div class="fields">${fields.filter((field) => field.value.trim()).map((field) => `<div class="field"><b>${escapeHtml(field.label)}</b><span class="${/license plate/i.test(field.label) ? "plate" : ""}">${escapeHtml(field.value)}</span></div>`).join("")}</div>`;
}

export function renderAtlasAssetPrint(target: Window, asset: PrintableAsset) {
  const photo = safeImage(asset.photoUrl || "");
  const content = `<header><h1>${escapeHtml(asset.title)}</h1><div class="sub">${escapeHtml(asset.property)} · Asset information</div></header>
    ${photo ? `<img class="hero" src="${escapeHtml(photo)}" alt="${escapeHtml(asset.title)}">` : ""}
    ${asset.vehicleFields?.length ? `<section><h2>Vehicle & registration</h2>${renderFields(asset.vehicleFields)}</section>` : ""}
    <section><h2>Asset details</h2>${renderFields(asset.fields)}</section>
    ${asset.detailsUnavailable ? '<p class="warning">Additional Info Card Fields could not load. Check Atlas before sharing this sheet.</p>' : ""}
    ${asset.notes?.trim() ? `<section><h2>Notes</h2><div class="copy">${escapeHtml(asset.notes)}</div></section>` : ""}
    ${asset.documents?.length ? `<section><h2>Documents in Atlas</h2><ul>${asset.documents.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul><small>Document files are stored in Atlas and are not included in this sheet.</small></section>` : ""}`;
  printPage(target, asset.title, content, Boolean(photo));
}

export function renderAtlasWorkOrderPrint(target: Window, work: PrintableWorkOrder) {
  const content = `<header><h1>${escapeHtml(work.title)}</h1><div class="sub">Work order · Fill out and return to Atlas</div></header>
    ${renderFields(work.fields)}
    ${work.description?.trim() ? `<section><h2>Work to do</h2><div class="copy">${escapeHtml(work.description)}</div></section>` : ""}
    <section><h2>Checklist</h2>${work.checklist.length ? `<ul class="checklist">${work.checklist.map((item) => `<li><span class="box">${item.completed ? "✓" : ""}</span><span>${escapeHtml(item.text)}</span></li>`).join("")}</ul>` : '<div class="lines"></div>'}</section>
    <section><h2>Work performed / findings</h2><div class="lines"></div></section>
    <section><h2>Parts / follow-up needed</h2><div class="lines"></div></section>
    <div class="signoff"><span>Completed by</span><span>Date / time</span></div>`;
  printPage(target, work.title, content);
}
