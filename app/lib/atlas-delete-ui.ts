let activeConfirmation: Promise<boolean> | null = null;

export function confirmAtlasDelete(message: string): Promise<boolean> {
  if (activeConfirmation) return activeConfirmation;
  activeConfirmation = new Promise<boolean>((resolve) => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", "Confirm deletion");
    dialog.style.cssText = "width:min(420px,calc(100% - 32px));padding:0;border:1px solid #D6AC48;border-radius:14px;background:#fff;color:#1D2939;box-shadow:0 20px 60px #071B2F40;font-family:inherit";
    const heading = document.createElement("div");
    heading.textContent = "Atlas";
    heading.style.cssText = "background:#0B2A44;color:white;padding:12px 16px;font-weight:700";
    const body = document.createElement("div");
    body.style.cssText = "padding:18px";
    const question = document.createElement("p");
    question.textContent = message;
    question.style.cssText = "margin:0 0 18px;font-size:16px;line-height:1.5";
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;justify-content:flex-end;gap:8px";
    const no = document.createElement("button");
    no.textContent = "Cancel";
    const yes = document.createElement("button");
    yes.textContent = "Yes, delete";
    for (const button of [no, yes]) {
      button.type = "button";
      button.style.cssText = "padding:9px 14px;min-height:40px;border:1px solid #D6AC48;border-radius:8px;font:inherit;cursor:pointer;background:white;color:#0B2A44";
    }
    yes.style.background = "#E8B44B";
    let finished = false;
    const finish = (value: boolean) => {
      if (finished) return;
      finished = true;
      dialog.close();
      dialog.remove();
      activeConfirmation = null;
      previous?.focus();
      resolve(value);
    };
    no.onclick = () => finish(false);
    yes.onclick = () => finish(true);
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); finish(false); });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) finish(false); });
    actions.append(no, yes);
    body.append(question, actions);
    dialog.append(heading, body);
    document.body.appendChild(dialog);
    dialog.showModal();
    no.focus();
  });
  return activeConfirmation;
}

export function showAtlasDeleteUndo(restore: () => Promise<boolean>) {
  let host = document.querySelector<HTMLElement>("[data-atlas-delete-undo]");
  if (!host) {
    host = document.createElement("div");
    host.setAttribute("data-atlas-delete-undo", "true");
    host.style.cssText = "position:fixed;right:16px;bottom:calc(20px + env(safe-area-inset-bottom));z-index:3000;display:grid;gap:6px";
    document.body.appendChild(host);
  }
  const row = document.createElement("div");
  row.setAttribute("role", "status");
  row.style.cssText = "display:flex;align-items:center;gap:10px;padding:7px 10px;border:1px solid #D6AC48;border-radius:8px;background:#fff;color:#0B2A44;font:14px inherit;box-shadow:0 3px 12px #071B2F20";
  const label = document.createElement("span");
  label.textContent = "Deleted";
  const undo = document.createElement("button");
  undo.type = "button";
  undo.textContent = "Undo";
  undo.style.cssText = "border:0;border-radius:5px;background:#FFF4D8;color:#0B2A44;padding:5px 8px;font:inherit;font-weight:700;cursor:pointer";
  const remove = () => { row.remove(); if (!host?.children.length) host?.remove(); };
  const timer = window.setTimeout(remove, 10000);
  undo.onclick = async () => {
    window.clearTimeout(timer);
    undo.disabled = true;
    label.textContent = "Restoring…";
    try {
      if (await restore()) { remove(); return; }
    } catch { /* Keep the failure visible. */ }
    label.textContent = "Could not restore";
    undo.disabled = false;
    window.setTimeout(remove, 10000);
  };
  row.append(label, undo);
  host.appendChild(row);
}
