type Note = { id?: string; text?: string; occurrenceDate?: string; workDate?: string; dueDate?: string; createdAt?: string };

export function currentOccurrenceNotes(record: { date?: string; recurring?: boolean; notesHistory?: Note[]; serviceHistory?: { notesHistory?: Note[] }[] }) {
  if (!record) return [];
  const archived = new Set((record.serviceHistory || []).flatMap((entry) => (entry.notesHistory || []).map((note) => note.id)));
  const date = String(record.date || "").slice(0, 10);
  return (record.notesHistory || []).filter((note) => {
    if (note.id && archived.has(note.id)) return false;
    const occurrenceDate = String(note.occurrenceDate || note.workDate || note.dueDate || "").slice(0, 10);
    if (!date) return true;
    if (occurrenceDate) return occurrenceDate === date;
    return !record.recurring || String(note.createdAt || "").slice(0, 10) === date;
  });
}

export function completedWorkNotes(record: Parameters<typeof currentOccurrenceNotes>[0], draft: string) {
  const saved = currentOccurrenceNotes(record).slice().reverse().map((note) => String(note.text || "").trim()).filter(Boolean);
  return Array.from(new Set([...saved, draft.trim()].filter(Boolean))).join("\n");
}
