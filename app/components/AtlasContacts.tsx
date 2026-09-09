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
    mutedSmallStyle,
    cardStyle,
    contactSearch,
    setContactSearch,
    inputStyle,
    editContact,
    noticeStyle,
    setContactEditorOpen,
    contactDraft,
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
  const [editing, setEditing] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

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
    ? entries.find((entry) => entry.kind === selected.kind && entry.id === selected.id) || null
    : null;

  const selectedStoredContact =
    selected?.kind === "contact" && selected.id !== "new"
      ? (contactRecords as ContactRecord[]).find((item) => item.id === selected.id)
      : undefined;

  useEffect(() => {
    if (!selectedContactId) return;
    setSelected({ kind: "contact", id: selectedContactId });
    setEditing(false);
  }, [selectedContactId]);

  useEffect(() => {
    if (selected || !visibleEntries.length) return;
    setSelected({ kind: visibleEntries[0].kind, id: visibleEntries[0].id });
  }, [selected, visibleEntries]);

  const kindLabel = (kind: DirectoryKind) =>
    kind === "coworker" ? "Coworker" : kind === "vendor" ? "Vendor" : "Contact";

  const openEntry = (entry: DirectoryEntry) => {
    setSelected({ kind: entry.kind, id: entry.id });
    setEditing(false);
    setContactEditorOpen?.(false);
    setContactMessage("");
    if (isMobile) setMobileDetailOpen(true);
  };

  const beginEdit = () => {
    if (!selectedStoredContact) return;
    editContact(selectedStoredContact);
    setContactEditorOpen?.(true);
    setEditing(true);
    setContactMessage("");
  };

  const addContact = () => {
    startNewContact();
    setSelected({ kind: "contact", id: "new" });
    setContactEditorOpen?.(true);
    setEditing(true);
    setContactMessage("");
    if (isMobile) setMobileDetailOpen(true);
  };

  const stopEditing = () => {
    setEditing(false);
    setContactEditorOpen?.(false);
    setContactMessage("");
    if (selected?.id === "new") setSelected(null);
  };

  const infoRow = (label: string, value: string, href?: string) => {
    const clean = String(value || "").trim();
    if (!clean) return null;
    return (
      <div
        key={label}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(120px, .32fr) minmax(0, 1fr)",
          gap: isMobile ? 3 : 12,
          alignItems: "start",
          padding: "10px 0",
          borderBottom: `1px solid ${colors.line}`,
        }}
      >
        <span style={{ ...mutedSmallStyle, fontWeight: 800 }}>{label}</span>
        {href ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            style={{ color: colors.navy, fontWeight: 750, textDecoration: "none", overflowWrap: "anywhere" }}
          >
            {clean}
          </a>
        ) : (
          <strong style={{ color: colors.navy, fontSize: 13, overflowWrap: "anywhere" }}>{clean}</strong>
        )}
      </div>
    );
  };

  const renderReadOnlyDetail = (entry: DirectoryEntry) => {
    const contact = entry.kind === "contact" ? (entry.source as ContactRecord) : null;
    const address = contact?.address || "";
    const birthday = contact?.birthday || "";
    const category = contact?.category || "";

    return (
      <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
        <section
          style={{
            border: `1px solid ${colors.line}`,
            borderRadius: 12,
            background: "#FFFFFF",
            padding: isMobile ? 12 : 14,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, color: colors.navy, fontSize: isMobile ? 20 : 22, lineHeight: 1.15 }}>
                {entry.name}
              </h2>
              <div style={{ ...mutedSmallStyle, marginTop: 4 }}>
                {[entry.organization, entry.role].filter(Boolean).join(" · ") || kindLabel(entry.kind)}
              </div>
            </div>
            <div style={{ ...buttonRowStyle, gap: 6 }}>
              {entry.phone ? (
                <a href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`} style={{ ...secondaryButtonStyle, textDecoration: "none" }}>
                  Call
                </a>
              ) : null}
              {entry.email ? (
                <a href={`mailto:${entry.email.trim()}`} style={{ ...secondaryButtonStyle, textDecoration: "none" }}>
                  Email
                </a>
              ) : null}
              {entry.kind === "vendor" ? (
                <button type="button" onClick={() => openVendor?.(entry.id)} style={goldButtonStyle}>
                  Open Vendor
                </button>
              ) : null}
              {entry.kind === "contact" ? (
                <button type="button" onClick={beginEdit} style={goldButtonStyle}>
                  Edit Contact
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section
          style={{
            border: `1px solid ${colors.line}`,
            borderRadius: 12,
            background: "#FFFFFF",
            padding: "4px 14px 8px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: "10px 0 4px",
              color: colors.navy,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            Contact Information
          </div>
          {infoRow("Company / Organization", entry.organization)}
          {infoRow("Role / Title", entry.role)}
          {infoRow("Category", category)}
          {infoRow("Phone", entry.phone, entry.phone ? `tel:${entry.phone.replace(/[^+\d]/g, "")}` : undefined)}
          {infoRow("Email", entry.email, entry.email ? `mailto:${entry.email.trim()}` : undefined)}
          {infoRow(
            "Website",
            entry.website,
            entry.website
              ? /^https?:\/\//i.test(entry.website)
                ? entry.website
                : `https://${entry.website}`
              : undefined,
          )}
          {infoRow("Address", address)}
          {infoRow("Birthday", birthday)}
        </section>

        {entry.notes ? (
          <section
            style={{
              border: `1px solid ${colors.line}`,
              borderRadius: 12,
              background: "#FFFFFF",
              padding: 14,
            }}
          >
            <div style={{ color: colors.navy, fontSize: 12, fontWeight: 900, marginBottom: 7 }}>Notes</div>
            <div style={{ color: colors.text, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {entry.notes}
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  const renderContactEditor = () => (
    <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
      <section
        style={{
          border: `1px solid ${colors.line}`,
          borderRadius: 12,
          background: "#FFFFFF",
          padding: isMobile ? 12 : 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: colors.navy, fontSize: isMobile ? 20 : 22 }}>
              {String(contactDraft.name || "").trim() || (selectedStoredContact ? "Edit Contact" : "New Contact")}
            </h2>
            <div style={{ ...mutedSmallStyle, marginTop: 3 }}>Contact Information</div>
          </div>
          <div style={{ ...buttonRowStyle, gap: 6 }}>
            <button type="button" onClick={stopEditing} style={secondaryButtonStyle}>Cancel</button>
            <button type="button" onClick={saveContact} style={goldButtonStyle}>Save Contact</button>
          </div>
        </div>

        {contactMessage ? <div style={{ ...noticeStyle, marginBottom: 10 }}>{contactMessage}</div> : null}

        <div
          style={{
            ...formGridStyle,
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
            gap: 10,
          }}
        >
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

        {selectedStoredContact ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                deleteContact(selectedStoredContact);
                setSelected(null);
                setEditing(false);
                if (isMobile) setMobileDetailOpen(false);
              }}
              style={dangerButtonStyle}
            >
              Delete Contact
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );

  const detailContent = editing
    ? renderContactEditor()
    : selectedEntry
      ? renderReadOnlyDetail(selectedEntry)
      : (
          <div style={noticeStyle}>
            <strong>Select a contact.</strong>
            <p style={{ ...mutedSmallStyle, marginBottom: 0 }}>Choose someone from the list to see their information.</p>
          </div>
        );

  return (
    <section
      style={{
        ...cardStyle,
        padding: isMobile ? 8 : 12,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <h1 style={{ margin: 0, color: colors.navy, fontSize: isMobile ? 22 : 26 }}>Contacts</h1>
        <button type="button" onClick={addContact} style={goldButtonStyle}>Add Contact</button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(260px,34%) minmax(0,66%)",
          gap: 12,
          alignItems: "start",
          minWidth: 0,
        }}
      >
        <div
          style={{
            minWidth: 0,
            height: isMobile ? "auto" : "calc(100dvh - 190px)",
            maxHeight: isMobile ? "none" : "calc(100dvh - 190px)",
            overflowY: isMobile ? "visible" : "auto",
            overflowX: "hidden",
            paddingRight: isMobile ? 0 : 5,
          }}
        >
          <div
            style={{
              position: isMobile ? "static" : "sticky",
              top: 0,
              zIndex: 4,
              background: colors.panel,
              paddingBottom: 8,
              display: "grid",
              gap: 6,
            }}
          >
            <input
              value={contactSearch}
              onChange={(event) => setContactSearch(event.currentTarget.value)}
              placeholder="Search contacts..."
              aria-label="Search contact directory"
              style={{ ...inputStyle, minWidth: 0, width: "100%", height: 36 }}
            />
            <div role="group" aria-label="Contact type" style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {([
                ["all", "All"],
                ["contact", "Contacts"],
                ["vendor", "Vendors"],
                ["coworker", "Coworkers"],
              ] as Array<[DirectoryFilter, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  style={{
                    ...secondaryButtonStyle,
                    minHeight: 30,
                    padding: "5px 8px",
                    fontSize: 11,
                    background: filter === value ? "#FFF3CF" : "#FFFFFF",
                    borderColor: filter === value ? colors.gold : colors.line,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <span style={{ ...mutedSmallStyle, fontSize: 10.5 }}>
              {visibleEntries.length} result{visibleEntries.length === 1 ? "" : "s"}
            </span>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {visibleEntries.map((entry) => {
              const active = selected?.kind === entry.kind && selected?.id === entry.id;
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => openEntry(entry)}
                  className="atlas-gold-hover-card"
                  style={{
                    width: "100%",
                    minWidth: 0,
                    minHeight: 54,
                    border: `1px solid ${active ? colors.gold : colors.line}`,
                    borderRadius: 9,
                    background: active ? "#FFFDF6" : "#FFFFFF",
                    padding: "8px 10px",
                    textAlign: "left",
                    cursor: "pointer",
                    boxShadow: "none",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: colors.navy,
                      fontSize: 12.5,
                      lineHeight: 1.25,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.name}
                  </strong>
                  <span
                    style={{
                      ...mutedSmallStyle,
                      display: "block",
                      marginTop: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {[entry.organization, entry.role].filter(Boolean).join(" · ") || kindLabel(entry.kind)}
                  </span>
                </button>
              );
            })}
            {!visibleEntries.length ? <div style={noticeStyle}>No contacts match this search.</div> : null}
          </div>
        </div>

        {!isMobile ? (
          <div
            style={{
              minWidth: 0,
              height: "calc(100dvh - 190px)",
              maxHeight: "calc(100dvh - 190px)",
              overflowY: "auto",
              overflowX: "hidden",
              paddingRight: 4,
            }}
          >
            {detailContent}
          </div>
        ) : null}
      </div>

      {isMobile && mobileDetailOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Contact details"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 260,
            background: colors.card,
            display: "grid",
            gridTemplateRows: "auto minmax(0,1fr)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              padding: "10px 12px",
              borderBottom: `1px solid ${colors.line}`,
              background: "#FFFFFF",
            }}
          >
            <strong style={{ color: colors.navy }}>{selectedEntry?.name || "Contact"}</strong>
            <button
              type="button"
              onClick={() => {
                setMobileDetailOpen(false);
                if (editing) stopEditing();
              }}
              aria-label="Close contact"
              style={{ ...secondaryButtonStyle, width: 40, minWidth: 40, height: 40, padding: 0, borderRadius: 999, fontSize: 22 }}
            >
              ×
            </button>
          </div>
          <div style={{ minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: 10 }}>
            {detailContent}
          </div>
        </div>
      ) : null}
    </section>
  );
}
