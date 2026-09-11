"use client";

import { useEffect } from "react";

const replacements = new Map([
  ["AI Property Workspace", "Atlas Property Search"],
  [
    "Ask a question, review matching Atlas records, and open the exact item without leaving the workspace.",
    "Search your saved Atlas records and open the exact item without leaving the workspace.",
  ],
  ["Atlas is reviewing property records...", "Atlas is searching property records..."],
]);

function replaceLabels() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const current = String(node.nodeValue || "").trim();
    const replacement = replacements.get(current);
    if (replacement) node.nodeValue = String(node.nodeValue).replace(current, replacement);
    node = walker.nextNode();
  }
}

export default function AtlasAskAtlasFreeLabels() {
  useEffect(() => {
    replaceLabels();
    const observer = new MutationObserver(replaceLabels);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
