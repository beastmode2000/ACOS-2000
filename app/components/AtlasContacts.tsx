"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ContactRecord, VendorRecord } from "../lib/atlas-types";
import { Field } from "./AtlasUiPrimitives";

type DirectoryKind = "contact" | "vendor" | "coworker";
type DirectoryFilter = "all" | "coworker" | "vendor" | "contact";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  propertyIds: string[];
  accessProfiles: string[];
};

type DirectoryEntry = {
  key: string;
  id: string;
  kind: DirectoryKind;
  name: string;
  organization: string;
  role: string;
  phone: string;
  email: string;
  website: string;
  notes: string;
  source: ContactRecord | VendorRecord | TeamMember;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("") || "C";

const titleCase = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AtlasContacts(props: any) {
  const {
    selectedContactId,
    contactRecords = [],
    vendorRecords = [],
    teamDirectory = [],
    activePropertyId,
    openVendor,
    isMobile,
    startNewContact,
    goldButtonStyle,
    colors,
    eyebrowStyle,
    mutedSmallStyle,
    cardStyle,
    contactSearch,
    setContactSearch,
    inputStyle,
    editContact,
    noticeStyle,
    setContactEditorOpen,
    stackStyle,
    contactDraft,
    contactAvatarLargeStyle,
    editorHeaderStyle,
    buttonRowStyle,
    secondaryButtonStyle,
    contactMessage,
    setContactMessage,
    formGridStyle,
    updateContactDraft,
    saveContact,
    dangerButtonStyle,
    deleteContact,
  } = props;

  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [selected, setSelected] = useState<{ kind: DirectoryKind; id: string } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const entries = useMemo<DirectoryEntry[]>(() => {
    const coworkers = (teamDirectory as TeamMember[])
      .filter((member) => member && member.active !== false)
      .filter(
        (member) =>
          !member.propertyIds?.length || member.propertyIds.includes(activePropertyId),
      )
      .map((member) => ({
        key: `coworker-${member.id}`,
        id: member.id,
        kind: "coworker" as const,
        name: member.name || member.email || "Coworker",
        organization: "Atlas Team",
        role: titleCase(member.role || "Coworker"),
        phone: "",
        email: member.email || "",
        website: "",
        notes: member.accessProfiles?.length
          ? `Access: ${member.accessProfiles.map(titleCase).join(", ")}`
          : "",
        source: member,
      }));

    const vendors = (vendorRecords as VendorRecord[]).map((vendor) => ({
      key: `vendor-${vendor.id}`,
      id: vendor.id,
      kind: "vendor" as const,
      name: vendor.name || "Unnamed Vendor",
      organization: vendor.name || "Vendor",
      role: vendor.category || "Vendor",
      phone: vendor.phone || "",
      email: vendor.email || "",
      website: vendor.website || "",
      notes: vendor.notes || "",
      source: vendor,
    }));

    const contacts = (contactRecords as ContactRecord[]).map((contact) => ({
      key: `contact-${contact.id}`,
      id: contact.id,
      kind: "contact" as const,
      name: contact.name || "Unnamed Contact",
      organization: contact.organization || "",
      role: contact.role || contact.category || "Contact",
      phone: contact.phone || "",
      email: contact.email || "",
      website: contact.website || "",
      notes: contact.notes || "",
      source: contact,
    }));

    return [...coworkers, ...vendors, ...contacts].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [activePropertyId, contactRecords, teamDirectory, vendorRecords]);

  const visibleEntries = useMemo(() => {
    const query = String(contactSearch || "").trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter !== "all" && entry.kind !== filter) return false;
      if (!query) return true;
      return [
        entry.name,
        entry.organization,
        entry.role,
        entry.phone,
        entry.email,
        entry.website,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [contactSearch, entries, filter]);

  const selectedEntry = selected
    ? entries.find(
        (entry) => entry.kind === selected.kind && entry.id === selected.id,
      ) || null
    : null;

  const closeDetail = () => {
    setDetailOpen(false);
    setContactMessage("");
    setContactEditorOpen?.(false);
  };

  useEffect(() => {
    if (!selectedContactId) return;
    setSelected({ kind: "contact", id: selectedContactId });
  }, [selectedContactId]);

  useEffect(() => {
    if (!detailOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  });

  const openEntry = (entry: DirectoryEntry) => {
    setSelected({ kind: entry.kind, id: entry.id });
    setContactMessage("");
    if (entry.kind === "contact") editContact(entry.source as ContactRecord);
    else setContactEditorOpen?.(false);
    setDetailOpen(true);
  };

  const addContact = () => {
    startNewContact();
    setSelected({ kind: "contact", id: "new" });
    setContactMessage("");
    setDetailOpen(true);
  };

  const selectedStoredContact =
    selected?.kind === "contact" && selected.id !== "new"
      ? (contactRecords as ContactRecord[]).find((item) => item.id === selected.id)
      : undefined;

  const kindLabel = (kind: DirectoryKind) =>
    kind === "coworker" ? "Coworker" : kind === "vendor" ? "Vendor" : "Contact";

  const quickActions = (entry: DirectoryEntry) => (
    <div style={{ ...buttonRowStyle, marginTop: 10, alignItems: "stretch" }}>
      {entry.phone ? (
        <a href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`} style={secondaryButtonStyle}>
          Call
        </a>
      ) : null}
      {entry.email ? (
        <a href={`mailto:${entry.email.trim()}`} style={secondaryButtonStyle}>
          Email
        </a>
      ) : null}
      {entry.website ? (
        <a
          href={/^https?:\/\//i.test(entry.website) ? entry.website : `https://${entry.website}`}
          target="_blank"
          rel="noopener noreferrer"
          style={secondaryButtonStyle}
        >
          Website
        </a>
      ) : null}
      {entry.kind === "vendor" ? (
        <button type="button" onClick={() => openVendor?.(entry.id)} style={goldButtonStyle}>
          Open Vendor
        </button>
      ) : null}
    </div>
  );

  const renderReadOnlyDetail = (entry: DirectoryEntry) => (
    <div style={{ ...stackStyle, gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
        <div style={contactAvatarLargeStyle}>{initials(entry.name)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={eyebrowStyle}>{kindLabel(entry.kind)}</div>
          <h2 style={{ ...editorHeaderStyle, overflowWrap: "anywhere" }}>{entry.name}</h2>
          <p style={{ ...mutedSmallStyle, marginTop: 3, overflowWrap: "anywhere" }}>
            {[entry.organization, entry.role].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {quickActions(entry)}
      <section style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: isMobile ? 12 : 16, minWidth: 0 }}>
        <div style={eyebrowStyle}>Contact Information</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 10 }}>
          {[
            ["Phone", entry.phone],
            ["Email", entry.email],
            ["Company", entry.organization],
            ["Role", entry.role],
            ["Website", entry.website],
          ].map(([label, value]) =>
            value ? (
              <div key={label} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: 10, minWidth: 0, background: "#FFFFFF" }}>
                <span style={{ ...mutedSmallStyle, display: "block" }}>{label}</span>
                <strong style={{ color: colors.navy, display: "block", marginTop: 3, overflowWrap: "anywhere" }}>{value}</strong>
              </div>
            ) : null,
          )}
        </div>
        {entry.notes ? <p style={{ margin: "12px 0 0", color: colors.text, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.notes}</p> : null}
      </section>
    </div>
  );

  const renderContactEditor = () => (
    <div style={{ ...stackStyle, gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
        <div style={contactAvatarLargeStyle}>{initials(String(contactDraft.name || ""))}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={eyebrowStyle}>Contact</div>
          <h2 style={{ ...editorHeaderStyle, overflowWrap: "anywhere" }}>
            {String(contactDraft.name || "").trim() || (selectedStoredContact ? "Edit Contact" : "New Contact")}
          </h2>
          <p style={{ ...mutedSmallStyle, marginTop: 3 }}>
            {[contactDraft.organization, contactDraft.role].filter(Boolean).join(" · ") || "Contact information"}
          </p>
        </div>
      </div>

      {contactMessage ? <div style={noticeStyle}>{contactMessage}</div> : null}

      <section style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: isMobile ? 12 : 16, minWidth: 0 }}>
        <div style={{ ...formGridStyle, gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <Field label="Name" value={contactDraft.name} onChange={(name) => updateContactDraft({ name })} />
          <Field label="Company / Organization" value={contactDraft.organization} onChange={(organization) => updateContactDraft({ organization })} />
          <Field label="Role / Title" value={contactDraft.role} onChange={(role) => updateContactDraft({ role })} />
          <Field label="Category" value={contactDraft.category} onChange={(category) => updateContactDraft({ category })} />
          <Field label="Phone Number" value={contactDraft.phone} onChange={(phone) => updateContactDraft({ phone })} />
          <Field label="Email Address" value={contactDraft.email} onChange={(email) => updateContactDraft({ email })} />
          <Field label="Address" value={contactDraft.address} onChange={(address) => updateContactDraft({ address })} />
          <Field label="Website" value={contactDraft.website} onChange={(website) => updateContactDraft({ website })} />
          <Field label="Birthday" value={contactDraft.birthday || ""} onChange={(birthday) => updateContactDraft({ birthday })} type="date" />
          <Field label="Notes" value={contactDraft.notes} onChange={(notes) => updateContactDraft({ notes })} multiline />
        </div>
        <div style={{ ...buttonRowStyle, marginTop: 12 }}>
          <button type="button" onClick={saveContact} style={goldButtonStyle}>Save Contact</button>
          {selectedStoredContact ? (
            <button type="button" onClick={() => { deleteContact(selectedStoredContact); closeDetail(); }} style={dangerButtonStyle}>Delete Contact</button>
          ) : null}
        </div>
      </section>
    </div>
  );

  return (
    <section style={{ ...cardStyle, padding: isMobile ? 10 : 14, minWidth: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={eyebrowStyle}>People</div>
          <h1 style={{ margin: "2px 0 0", color: colors.navy, fontSize: isMobile ? 22 : 26 }}>Contacts</h1>
        </div>
        <button type="button" onClick={addContact} style={goldButtonStyle}>Add Contact</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(240px,1fr) auto", gap: 8, marginTop: 12, alignItems: "stretch" }}>
        <input value={contactSearch} onChange={(event) => setContactSearch(event.currentTarget.value)} placeholder="Search people, companies, phone, or email" aria-label="Search contact directory" style={{ ...inputStyle, minWidth: 0, width: "100%" }} />
        <div role="group" aria-label="Contact type" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {([
            ["all", "All"],
            ["coworker", "Coworkers"],
            ["vendor", "Vendors"],
            ["contact", "Contacts"],
          ] as Array<[DirectoryFilter, string]>).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} style={filter === value ? goldButtonStyle : secondaryButtonStyle}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(250px,1fr))", gap: 8, marginTop: 12, minWidth: 0 }}>
        {visibleEntries.map((entry) => (
          <button key={entry.key} type="button" onClick={() => openEntry(entry)} style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 10, alignItems: "center", width: "100%", minWidth: 0, border: `1px solid ${colors.line}`, borderRadius: 12, background: "#FFFFFF", padding: 10, textAlign: "left", cursor: "pointer" }}>
            <div style={{ width: 42, height: 42, borderRadius: 999, display: "grid", placeItems: "center", background: entry.kind === "vendor" ? "#FFF4D6" : entry.kind === "coworker" ? "#EAF2FB" : "#F1F3F5", color: colors.navy, fontWeight: 900 }}>{initials(entry.name)}</div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", color: colors.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</strong>
              <span style={{ ...mutedSmallStyle, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[entry.organization, entry.role].filter(Boolean).join(" · ") || kindLabel(entry.kind)}</span>
              <span style={{ display: "block", marginTop: 3, color: colors.text, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.phone || entry.email || "No phone or email saved"}</span>
            </div>
          </button>
        ))}
        {!visibleEntries.length ? <div style={noticeStyle}>No directory entries match this search.</div> : null}
      </div>

      {detailOpen ? (
        <div role="dialog" aria-modal="true" aria-label="Contact details" onClick={(event) => { if (event.currentTarget === event.target) closeDetail(); }} style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(7,27,47,.72)", display: "grid", placeItems: isMobile ? "stretch" : "center", padding: isMobile ? 0 : 20 }}>
          <div style={{ width: "100%", maxWidth: isMobile ? "none" : 920, height: isMobile ? "100dvh" : "min(86vh,850px)", minWidth: 0, background: colors.card, borderRadius: isMobile ? 0 : 18, overflow: "hidden", display: "grid", gridTemplateRows: "auto minmax(0,1fr)", boxShadow: "0 28px 80px rgba(0,0,0,.28)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${colors.line}`, background: "#FFFFFF" }}>
              <strong style={{ color: colors.navy }}>{selected?.id === "new" ? "New Contact" : selectedEntry?.name || "Contact"}</strong>
              <button type="button" onClick={closeDetail} aria-label="Close contact" style={{ ...secondaryButtonStyle, width: 42, minWidth: 42, height: 42, padding: 0, borderRadius: 999, fontSize: 24, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: isMobile ? 12 : 18, WebkitOverflowScrolling: "touch" }}>
              {selected?.kind === "contact" ? renderContactEditor() : selectedEntry ? renderReadOnlyDetail(selectedEntry) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
