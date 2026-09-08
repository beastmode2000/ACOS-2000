"use client";

import React from "react";
import { Field } from "./AtlasUiPrimitives";
import { colors } from "../lib/atlas-page-config";
import type { AssetRecord, VendorRecord } from "../lib/atlas-types";
import {
  badgeStyle,
  formatDate,
  ListDrawerLayout,
  uid,
} from "./AtlasAppFoundation";

type VendorContactCard = {
  id: string;
  name: string;
  role: string;
  phone: string;
  officePhone: string;
  cellPhone: string;
  email: string;
  contactType:
    | "Office"
    | "Owner"
    | "Manager"
    | "Sales"
    | "Service"
    | "Installation"
    | "Technician"
    | "Billing"
    | "Emergency"
    | "Other";
  primary: boolean;
  preferredMethod: "Office" | "Cell" | "Email";
  notes: string;
  inactive?: boolean;
};

type VendorContactMeta = {
  extension: string;
  assetIds: string[];
  locationIds: string[];
  serviceAreas: string[];
};

type VendorContactDraft = VendorContactCard & VendorContactMeta & {
  displayNotes: string;
};

const vendorDepartmentTypes: VendorContactCard["contactType"][] = [
  "Office",
  "Service",
  "Technician",
  "Billing",
  "Sales",
  "Installation",
  "Manager",
  "Owner",
  "Emergency",
  "Other",
];

const vendorServiceAreas = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Appliances",
  "Pool & Spa",
  "Irrigation",
  "Landscape",
  "Lighting",
  "Security / Low Voltage",
  "Garage",
  "Dock / Marine",
  "General House",
];

const CONTACT_META_PREFIX = "[[ATLAS_CONTACT_META:";
const CONTACT_META_SUFFIX = "]]";

function uniqueStrings(values: unknown) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

function parseContactNotes(value: unknown): { displayNotes: string; meta: VendorContactMeta } {
  const source = String(value || "");
  const start = source.lastIndexOf(CONTACT_META_PREFIX);
  const end = start >= 0 ? source.indexOf(CONTACT_META_SUFFIX, start) : -1;
  const fallback: VendorContactMeta = {
    extension: "",
    assetIds: [],
    locationIds: [],
    serviceAreas: [],
  };

  if (start < 0 || end < 0) {
    return { displayNotes: source.trim(), meta: fallback };
  }

  const encoded = source.slice(start + CONTACT_META_PREFIX.length, end);
  let parsed: Partial<VendorContactMeta> = {};
  try {
    parsed = JSON.parse(decodeURIComponent(encoded));
  } catch {
    parsed = {};
  }

  return {
    displayNotes: `${source.slice(0, start)}${source.slice(end + CONTACT_META_SUFFIX.length)}`.trim(),
    meta: {
      extension: String(parsed.extension || ""),
      assetIds: uniqueStrings(parsed.assetIds),
      locationIds: uniqueStrings(parsed.locationIds),
      serviceAreas: uniqueStrings(parsed.serviceAreas),
    },
  };
}

function composeContactNotes(displayNotes: string, meta: VendorContactMeta) {
  const normalizedMeta: VendorContactMeta = {
    extension: String(meta.extension || "").trim(),
    assetIds: uniqueStrings(meta.assetIds),
    locationIds: uniqueStrings(meta.locationIds),
    serviceAreas: uniqueStrings(meta.serviceAreas),
  };
  const hasMeta =
    normalizedMeta.extension ||
    normalizedMeta.assetIds.length ||
    normalizedMeta.locationIds.length ||
    normalizedMeta.serviceAreas.length;
  const cleanNotes = String(displayNotes || "").trim();
  if (!hasMeta) return cleanNotes;
  const marker = `${CONTACT_META_PREFIX}${encodeURIComponent(JSON.stringify(normalizedMeta))}${CONTACT_META_SUFFIX}`;
  return [cleanNotes, marker].filter(Boolean).join("\n\n");
}

function blankVendorContact(primary: boolean): VendorContactDraft {
  return {
    id: uid("vendor-contact"),
    name: "",
    role: "",
    phone: "",
    officePhone: "",
    cellPhone: "",
    email: "",
    contactType: "Service",
    primary,
    preferredMethod: "Cell",
    notes: "",
    inactive: false,
    extension: "",
    assetIds: [],
    locationIds: [],
    serviceAreas: [],
    displayNotes: "",
  };
}

function contactToDraft(contact: VendorContactCard): VendorContactDraft {
  const parsed = parseContactNotes(contact.notes);
  return {
    ...contact,
    extension: parsed.meta.extension,
    assetIds: parsed.meta.assetIds,
    locationIds: parsed.meta.locationIds,
    serviceAreas: parsed.meta.serviceAreas,
    displayNotes: parsed.displayNotes,
  };
}

export default function AtlasVendorsWorkspace(props: any) {
  const [vendorSearch, setVendorSearch] = React.useState("");
  const [vendorEditing, setVendorEditing] = React.useState(false);
  const [showInactiveContacts, setShowInactiveContacts] = React.useState(false);
  const [contactDraft, setContactDraft] = React.useState<VendorContactDraft | null>(null);
  const [contactMode, setContactMode] = React.useState<"new" | "edit">("new");
  const [contactSaving, setContactSaving] = React.useState(false);

  const {
    addLinkedPhotoFiles,
    addVendor,
    assetName,
    assetRecords,
    buttonRowStyle,
    compactLinkedListStyle,
    compactLinkedRowStyle,
    compactUploadButtonStyle,
    dangerButtonStyle,
    deleteLinkedImage,
    deleteVendorRecord,
    detailSectionHeaderStyle,
    detailSectionStyle,
    editorHeaderStyle,
    eyebrowStyle,
    filteredVendors,
    goldButtonStyle,
    imageFilesFromPasteEvent,
    isMobile,
    isRecordDirty,
    linkedImageFilesFor,
    listStyle,
    locationName = (id: string) => id,
    locations = [],
    mutedSmallStyle,
    noticeStyle,
    openUploadedFile,
    pasteLinkedPhoto,
    photoDeleteButtonStyle,
    recordListIdentityStyle,
    renderLinkedDocuments,
    rowButtonStyle,
    saveDirtyRecord,
    secondaryButtonStyle,
    selectedVendor,
    selectedVendorId,
    serviceRecords,
    setScreen,
    setSelectedAssetId,
    setSelectedServiceId,
    setSelectedTaskId,
    setSelectedVendorId,
    setTasksView,
    stackStyle,
    taskDetails,
    updateVendor,
    vendorLogoFor,
    vendorLogoImageStyle,
    vendorLogoThumbStyle,
    workPlanTasks,
  } = props;

  const selectedVendorLogo = selectedVendor.id
    ? vendorLogoFor(selectedVendor.id)
    : undefined;

  React.useEffect(() => {
    setVendorEditing(false);
    setShowInactiveContacts(false);
    setContactDraft(null);
  }, [selectedVendorId]);

  const selectedVendorPhotos = selectedVendor.id
    ? linkedImageFilesFor("Vendor", selectedVendor.id).filter(
        (file: any) => !/vendor\s*logo/i.test(String(file?.name || "")),
      )
    : [];

  const vendorContacts: VendorContactCard[] = Array.isArray(selectedVendor.contacts)
    ? selectedVendor.contacts
    : [];
  const activeVendorContacts = vendorContacts.filter((contact) => !contact.inactive);
  const inactiveVendorContacts = vendorContacts.filter((contact) => contact.inactive);
  const visibleVendorContacts = showInactiveContacts
    ? [...activeVendorContacts, ...inactiveVendorContacts]
    : activeVendorContacts;

  const normalizedContactSet = (contacts: VendorContactCard[]) => {
    let next = contacts.map((contact) => ({
      ...contact,
      primary: contact.inactive ? false : Boolean(contact.primary),
    }));
    const active = next.filter((contact) => !contact.inactive);
    if (active.length && !active.some((contact) => contact.primary)) {
      const firstId = active[0].id;
      next = next.map((contact) =>
        contact.id === firstId ? { ...contact, primary: true } : contact,
      );
    }
    return next;
  };

  const persistVendorContacts = async (contacts: VendorContactCard[]) => {
    const next = normalizedContactSet(contacts);
    updateVendor({ contacts: next });
    await saveDirtyRecord(
      "vendors",
      { ...selectedVendor, contacts: next },
      "vendor",
      selectedVendor.id,
    );
  };

  const openNewContact = () => {
    setContactMode("new");
    setContactDraft(blankVendorContact(activeVendorContacts.length === 0));
  };

  const openExistingContact = (contact: VendorContactCard) => {
    setContactMode("edit");
    setContactDraft(contactToDraft(contact));
  };

  const saveContact = async () => {
    if (!contactDraft || contactSaving) return;
    setContactSaving(true);
    try {
      const stored: VendorContactCard = {
        id: contactDraft.id,
        name: contactDraft.name.trim(),
        role: contactDraft.role.trim(),
        phone: contactDraft.cellPhone.trim(),
        officePhone: contactDraft.officePhone.trim(),
        cellPhone: contactDraft.cellPhone.trim(),
        email: contactDraft.email.trim(),
        contactType: contactDraft.contactType,
        primary: contactDraft.primary,
        preferredMethod: contactDraft.preferredMethod,
        notes: composeContactNotes(contactDraft.displayNotes, {
          extension: contactDraft.extension,
          assetIds: contactDraft.assetIds,
          locationIds: contactDraft.locationIds,
          serviceAreas: contactDraft.serviceAreas,
        }),
        inactive: Boolean(contactDraft.inactive),
      };

      let next = vendorContacts.map((contact) =>
        stored.primary && contact.id !== stored.id ? { ...contact, primary: false } : contact,
      );
      if (contactMode === "new") next = [...next, stored];
      else next = next.map((contact) => (contact.id === stored.id ? stored : contact));

      await persistVendorContacts(next);
      setContactDraft(null);
    } finally {
      setContactSaving(false);
    }
  };

  const archiveContact = async () => {
    if (!contactDraft || contactSaving) return;
    setContactSaving(true);
    try {
      const next = vendorContacts.map((contact) =>
        contact.id === contactDraft.id
          ? { ...contact, inactive: !contactDraft.inactive, primary: false }
          : contact,
      );
      await persistVendorContacts(next);
      setContactDraft(null);
    } finally {
      setContactSaving(false);
    }
  };

  const deleteVendorContact = async () => {
    if (!contactDraft || contactSaving) return;
    if (!window.confirm("Delete this vendor contact?")) return;
    setContactSaving(true);
    try {
      await persistVendorContacts(
        vendorContacts.filter((contact) => contact.id !== contactDraft.id),
      );
      setContactDraft(null);
    } finally {
      setContactSaving(false);
    }
  };

  const relatedVendorAssets: AssetRecord[] = selectedVendor.id
    ? [...(assetRecords as AssetRecord[])]
        .filter((asset) => asset.vendorIds.includes(selectedVendor.id))
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
    : [];

  const allAssetOptions = [...(assetRecords as AssetRecord[])].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || "")),
  );

  const locationOptions = (() => {
    const seen = new Set<string>();
    const rows: Array<{ id: string; name: string }> = [];
    for (const location of Array.isArray(locations) ? locations : []) {
      const id = String(location?.id || "").trim();
      const name = String(location?.name || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      rows.push({ id, name: name || locationName(id) || id });
    }
    for (const asset of allAssetOptions) {
      const ids = [String((asset as any).locationId || ""), ...(((asset as any).locationIds || []) as string[])];
      for (const id of ids.filter(Boolean)) {
        if (id === "general" || seen.has(id)) continue;
        seen.add(id);
        rows.push({ id, name: locationName(id) || id });
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  })();

  const relatedVendorWorkOrders = selectedVendor.id
    ? [...serviceRecords]
        .filter((record) => record.vendorId === selectedVendor.id)
        .sort((a, b) =>
          String(
            b.serviceHistory?.[0]?.completedAt ||
              b.lastCompletedDate ||
              b.date ||
              "",
          ).localeCompare(
            String(
              a.serviceHistory?.[0]?.completedAt ||
                a.lastCompletedDate ||
                a.date ||
                "",
            ),
          ),
        )
    : [];

  const relatedVendorTasks = selectedVendor.id
    ? workPlanTasks
        .filter((task) => taskDetails(task.id).vendorId === selectedVendor.id)
        .sort((a, b) =>
          String(taskDetails(a.id).dueDate || "9999-12-31").localeCompare(
            String(taskDetails(b.id).dueDate || "9999-12-31"),
          ),
        )
    : [];

  const lastVendorVisit =
    relatedVendorWorkOrders.find((record) => record.status === "Completed") ||
    relatedVendorWorkOrders[0];

  const vendorCompletedVisitCount = relatedVendorWorkOrders.reduce(
    (count, record) =>
      count +
      (Array.isArray(record.serviceHistory) && record.serviceHistory.length
        ? record.serviceHistory.length
        : record.status === "Completed"
          ? 1
          : 0),
    0,
  );

  const visibleVendors = filteredVendors.filter((vendor: VendorRecord) => {
    const query = vendorSearch.trim().toLowerCase();
    if (!query) return true;
    const contacts = Array.isArray(
      (vendor as VendorRecord & { contacts?: VendorContactCard[] }).contacts,
    )
      ? (vendor as VendorRecord & { contacts?: VendorContactCard[] }).contacts || []
      : [];

    return [
      vendor.name,
      vendor.category,
      vendor.phone,
      vendor.email,
      vendor.website,
      vendor.notes,
      ...contacts.flatMap((contact) => [
        contact.name,
        contact.role,
        contact.contactType,
        contact.officePhone,
        contact.cellPhone,
        contact.email,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const infoCard = (label: string, value?: string, href?: string) => {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) return null;
    return (
      <div
        style={{
          border: `1px solid ${colors.line}`,
          borderRadius: 10,
          background: "#FFFFFF",
          padding: "9px 10px",
          minWidth: 0,
        }}
      >
        <span style={{ ...mutedSmallStyle, display: "block", marginBottom: 3 }}>
          {label}
        </span>
        {href ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            style={{
              color: colors.navy,
              fontWeight: 800,
              textDecoration: "none",
              overflowWrap: "anywhere",
            }}
          >
            {cleanValue}
          </a>
        ) : (
          <strong
            style={{
              color: colors.navy,
              display: "block",
              overflowWrap: "anywhere",
            }}
          >
            {cleanValue}
          </strong>
        )}
      </div>
    );
  };

  const selectedLogoSrc = selectedVendorLogo?.dataUrl || selectedVendorLogo?.url || "";

  const toggleDraftArray = (
    key: "assetIds" | "locationIds" | "serviceAreas",
    value: string,
  ) => {
    setContactDraft((current) => {
      if (!current) return current;
      const values = current[key];
      const next = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...current, [key]: next };
    });
  };

  const relationshipDropdown = (
    label: string,
    key: "assetIds" | "locationIds" | "serviceAreas",
    options: Array<{ id: string; label: string; detail?: string }>,
  ) => {
    if (!contactDraft) return null;
    const selected = contactDraft[key];
    return (
      <details
        style={{
          border: `1px solid ${colors.line}`,
          borderRadius: 9,
          background: "#FFFFFF",
          minWidth: 0,
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            listStyle: "none",
            minHeight: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "7px 9px",
            color: colors.navy,
            fontWeight: 800,
          }}
        >
          <span>{label}</span>
          <span style={mutedSmallStyle}>{selected.length ? `${selected.length} selected` : "Select"}</span>
        </summary>
        <div
          style={{
            borderTop: `1px solid ${colors.line}`,
            maxHeight: 220,
            overflowY: "auto",
            padding: 7,
            display: "grid",
            gap: 4,
          }}
        >
          {options.length ? (
            options.map((option) => (
              <label
                key={option.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px minmax(0,1fr)",
                  gap: 7,
                  alignItems: "start",
                  padding: "6px 7px",
                  borderRadius: 7,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.id)}
                  onChange={() => toggleDraftArray(key, option.id)}
                />
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", color: colors.navy, fontSize: 12 }}>
                    {option.label}
                  </strong>
                  {option.detail ? (
                    <small style={mutedSmallStyle}>{option.detail}</small>
                  ) : null}
                </span>
              </label>
            ))
          ) : (
            <div style={{ ...mutedSmallStyle, padding: 6 }}>No options available.</div>
          )}
        </div>
      </details>
    );
  };

  return (
    <>
      <ListDrawerLayout
        eyebrow=""
        title="Vendors"
        isMobile={isMobile}
        drawerResetKey={selectedVendorId || "vendor-new"}
        outerStyle={{ gap: isMobile ? 8 : 6 }}
        gridStyleOverride={
          isMobile
            ? { minWidth: 0, overflowX: "hidden", marginTop: 0 }
            : {
                gridTemplateColumns: "minmax(270px, 34%) minmax(0, 66%)",
                gap: 12,
                alignItems: "start",
                overflow: "visible",
                marginTop: 0,
              }
        }
        listPanelStyleOverride={
          isMobile
            ? { minWidth: 0, overflowX: "hidden", padding: 0 }
            : {
                minWidth: 0,
                maxHeight: "calc(100vh - 148px)",
                overflowY: "auto",
                overflowX: "hidden",
                paddingRight: 6,
                alignSelf: "start",
              }
        }
        drawerStyleOverride={
          isMobile
            ? { minWidth: 0, overflowX: "hidden" }
            : {
                minWidth: 0,
                height: "calc(100dvh - 148px)",
                maxHeight: "calc(100dvh - 148px)",
                overflowY: "auto",
                overflowX: "hidden",
                paddingBottom: 18,
              }
        }
        right={
          <button type="button" onClick={() => addVendor()} style={goldButtonStyle}>
            Add Vendor
          </button>
        }
        list={
          <div style={{ ...listStyle, gap: 6 }}>
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 5,
                display: "grid",
                gap: 6,
                paddingBottom: 6,
                background: colors.panel,
              }}
            >
              <input
                type="search"
                value={vendorSearch}
                onChange={(event) => setVendorSearch(event.currentTarget.value)}
                placeholder="Search vendors..."
                aria-label="Search vendors"
                style={{
                  width: "100%",
                  minWidth: 0,
                  height: 36,
                  boxSizing: "border-box",
                  border: `1px solid ${colors.line}`,
                  borderRadius: 10,
                  padding: "7px 10px",
                  background: "#FFFFFF",
                  color: colors.text,
                  font: "inherit",
                  outline: "none",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span style={mutedSmallStyle}>
                  {visibleVendors.length} vendor{visibleVendors.length === 1 ? "" : "s"}
                </span>
                {vendorSearch ? (
                  <button
                    type="button"
                    onClick={() => setVendorSearch("")}
                    style={{
                      ...secondaryButtonStyle,
                      minHeight: 28,
                      padding: "4px 7px",
                      fontSize: 11,
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            {visibleVendors.map((vendor: VendorRecord) => {
              const logo = vendorLogoFor(vendor.id);
              const logoSrc = logo?.dataUrl || logo?.url || "";
              return (
                <button
                  key={vendor.id}
                  type="button"
                  className="atlas-gold-hover-card"
                  onClick={() => setSelectedVendorId(vendor.id)}
                  style={{
                    ...rowButtonStyle,
                    padding: "8px 9px",
                    minHeight: 0,
                    borderRadius: 10,
                    borderColor: vendor.id === selectedVendor.id ? colors.gold : colors.line,
                    background: vendor.id === selectedVendor.id ? "#F4F8FD" : "#FFFFFF",
                    boxShadow: "none",
                  }}
                >
                  <div style={recordListIdentityStyle}>
                    <div style={vendorLogoThumbStyle}>
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={`${vendor.name} logo`}
                          style={vendorLogoImageStyle}
                        />
                      ) : (
                        <span>{vendor.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong>{vendor.name}</strong>
                      {vendor.category ? <p style={mutedSmallStyle}>{vendor.category}</p> : null}
                    </div>
                  </div>
                </button>
              );
            })}

            {!visibleVendors.length ? (
              <div style={noticeStyle}>No vendors match this search.</div>
            ) : null}
          </div>
        }
        drawer={
          selectedVendor.id ? (
            <div
              style={{ ...stackStyle, gap: 9, minWidth: 0 }}
              tabIndex={0}
              onPaste={(event) => {
                const files = imageFilesFromPasteEvent(event);
                if (!files.length) return;
                event.preventDefault();
                void addLinkedPhotoFiles(
                  "Vendor",
                  selectedVendor.id,
                  selectedVendor.name,
                  files,
                  "Photo",
                );
              }}
            >
              <section
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 14,
                  background: "#FFFFFF",
                  padding: isMobile ? 10 : 11,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "58px minmax(0,1fr)"
                      : "66px minmax(0,1fr) auto",
                    gap: 10,
                    alignItems: "center",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? 58 : 66,
                      height: isMobile ? 58 : 66,
                      borderRadius: selectedLogoSrc ? 10 : 0,
                      border: selectedLogoSrc ? `1px solid ${colors.line}` : 0,
                      background: "#FFFFFF",
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      color: colors.navy,
                      fontWeight: 900,
                      fontSize: selectedLogoSrc ? undefined : 18,
                      flex: "0 0 auto",
                    }}
                  >
                    {selectedLogoSrc ? (
                      <img
                        src={selectedLogoSrc}
                        alt={`${selectedVendor.name} logo`}
                        style={{
                          ...vendorLogoImageStyle,
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          padding: 5,
                          boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <span>{selectedVendor.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{ ...editorHeaderStyle, margin: 0, overflowWrap: "anywhere" }}
                    >
                      {selectedVendor.name.trim() || "Vendor"}
                    </h3>
                    {selectedVendor.category ? (
                      <div style={{ ...mutedSmallStyle, marginTop: 2 }}>{selectedVendor.category}</div>
                    ) : null}
                    <div style={{ ...mutedSmallStyle, marginTop: 3 }}>
                      {lastVendorVisit
                        ? `Last visit ${formatDate(
                            String(
                              lastVendorVisit.serviceHistory?.[0]?.completedAt ||
                                lastVendorVisit.lastCompletedDate ||
                                lastVendorVisit.date ||
                                "",
                            ).slice(0, 10),
                          )}`
                        : "No visit recorded"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      justifyContent: isMobile ? "flex-start" : "flex-end",
                      gridColumn: isMobile ? "1 / -1" : undefined,
                    }}
                  >
                    <button type="button" onClick={openNewContact} style={goldButtonStyle}>
                      + Add Contact
                    </button>
                    <button
                      type="button"
                      onClick={() => setVendorEditing((current) => !current)}
                      style={secondaryButtonStyle}
                    >
                      {vendorEditing ? "Done" : "Edit Vendor"}
                    </button>
                    {isRecordDirty("vendor", selectedVendor.id) ? (
                      <button
                        type="button"
                        onClick={() =>
                          void saveDirtyRecord(
                            "vendors",
                            selectedVendor,
                            "vendor",
                            selectedVendor.id,
                          )
                        }
                        style={goldButtonStyle}
                      >
                        Save Vendor
                      </button>
                    ) : null}
                  </div>
                </div>

                {vendorEditing ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 9,
                      paddingTop: 9,
                      borderTop: `1px solid ${colors.line}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        void pasteLinkedPhoto(
                          "Vendor",
                          selectedVendor.id,
                          selectedVendor.name,
                          "Vendor Logo",
                        )
                      }
                      style={secondaryButtonStyle}
                    >
                      Paste Logo
                    </button>
                    <label style={compactUploadButtonStyle}>
                      Choose Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          void addLinkedPhotoFiles(
                            "Vendor",
                            selectedVendor.id,
                            selectedVendor.name,
                            event.currentTarget.files,
                            "Vendor Logo",
                          );
                          event.currentTarget.value = "";
                        }}
                        style={{ display: "none" }}
                      />
                    </label>
                    {selectedVendorLogo ? (
                      <button
                        type="button"
                        onClick={() => void deleteLinkedImage(selectedVendorLogo)}
                        style={dangerButtonStyle}
                      >
                        Remove Logo
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section style={detailSectionStyle}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Vendor Information</div>
                    <strong>Company details</strong>
                  </div>
                  {!vendorEditing && (selectedVendor.phone || selectedVendor.email) ? (
                    <div style={buttonRowStyle}>
                      {selectedVendor.phone ? (
                        <a
                          href={`tel:${String(selectedVendor.phone).replace(/[^+\d]/g, "")}`}
                          style={{ ...secondaryButtonStyle, textDecoration: "none" }}
                        >
                          Call
                        </a>
                      ) : null}
                      {selectedVendor.email ? (
                        <a
                          href={`mailto:${selectedVendor.email}`}
                          style={{ ...secondaryButtonStyle, textDecoration: "none" }}
                        >
                          Email
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {vendorEditing ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
                      gap: 9,
                    }}
                  >
                    <Field label="Name" value={selectedVendor.name} onChange={(value) => updateVendor({ name: value })} />
                    <Field label="Category" value={selectedVendor.category} onChange={(value) => updateVendor({ category: value })} />
                    <Field label="Main Phone" value={selectedVendor.phone ?? ""} onChange={(value) => updateVendor({ phone: value })} />
                    <Field label="Main Email" value={selectedVendor.email ?? ""} onChange={(value) => updateVendor({ email: value })} />
                    <Field label="Website" value={selectedVendor.website ?? ""} onChange={(value) => updateVendor({ website: value })} />
                    <Field label="Notes" value={selectedVendor.notes ?? ""} onChange={(value) => updateVendor({ notes: value })} multiline />
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
                        gap: 8,
                      }}
                    >
                      {infoCard("Main Phone", selectedVendor.phone, selectedVendor.phone ? `tel:${String(selectedVendor.phone).replace(/[^+\d]/g, "")}` : undefined)}
                      {infoCard("Main Email", selectedVendor.email, selectedVendor.email ? `mailto:${selectedVendor.email}` : undefined)}
                      {infoCard(
                        "Website",
                        selectedVendor.website,
                        selectedVendor.website
                          ? /^https?:\/\//i.test(selectedVendor.website)
                            ? selectedVendor.website
                            : `https://${selectedVendor.website}`
                          : undefined,
                      )}
                      {infoCard("Category", selectedVendor.category)}
                    </div>
                    {selectedVendor.notes ? (
                      <div
                        style={{
                          borderTop: `1px solid ${colors.line}`,
                          marginTop: 10,
                          paddingTop: 10,
                          whiteSpace: "pre-wrap",
                          color: colors.text,
                        }}
                      >
                        {selectedVendor.notes}
                      </div>
                    ) : null}
                  </>
                )}
              </section>

              <section style={detailSectionStyle}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Contacts</div>
                    <strong>{activeVendorContacts.length} active</strong>
                  </div>
                  <div style={buttonRowStyle}>
                    {inactiveVendorContacts.length ? (
                      <button
                        type="button"
                        onClick={() => setShowInactiveContacts((current) => !current)}
                        style={secondaryButtonStyle}
                      >
                        {showInactiveContacts ? "Hide inactive" : `Inactive (${inactiveVendorContacts.length})`}
                      </button>
                    ) : null}
                    <button type="button" onClick={openNewContact} style={goldButtonStyle}>
                      + Add Contact
                    </button>
                  </div>
                </div>

                {visibleVendorContacts.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
                      gap: 8,
                    }}
                  >
                    {visibleVendorContacts.map((contact) => {
                      const parsed = parseContactNotes(contact.notes);
                      const cell = String(contact.cellPhone || contact.phone || "").trim();
                      const officePhone = String(contact.officePhone || "").trim();
                      const email = String(contact.email || "").trim();
                      const name = String(contact.name || "").trim() || contact.contactType;
                      const role = String(contact.role || "").trim();
                      const relationSummary = [
                        parsed.meta.assetIds.length ? `${parsed.meta.assetIds.length} asset${parsed.meta.assetIds.length === 1 ? "" : "s"}` : "",
                        parsed.meta.locationIds.length ? `${parsed.meta.locationIds.length} location${parsed.meta.locationIds.length === 1 ? "" : "s"}` : "",
                      ].filter(Boolean);

                      return (
                        <article
                          key={contact.id}
                          className="atlas-gold-hover-card"
                          onClick={() => openExistingContact(contact)}
                          style={{
                            border: `1px solid ${contact.primary ? colors.gold : colors.line}`,
                            borderRadius: 11,
                            background: contact.inactive ? "#F8FAFC" : "#FFFFFF",
                            padding: 10,
                            minWidth: 0,
                            opacity: contact.inactive ? 0.68 : 1,
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ color: colors.navy, fontSize: 13 }}>{name}</strong>
                              {(role || contact.contactType) ? (
                                <div style={{ ...mutedSmallStyle, marginTop: 2 }}>
                                  {[role, contact.contactType].filter(Boolean).join(" · ")}
                                </div>
                              ) : null}
                            </div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                              {contact.primary ? <span style={badgeStyle("Preferred")}>Primary</span> : null}
                              {contact.inactive ? <span style={badgeStyle("Monitor")}>Inactive</span> : null}
                            </div>
                          </div>

                          {(cell || officePhone || email) ? (
                            <div style={{ display: "grid", gap: 3, marginTop: 7 }}>
                              {cell ? (
                                <a
                                  href={`tel:${cell.replace(/[^+\d]/g, "")}`}
                                  onClick={(event) => event.stopPropagation()}
                                  style={{ color: colors.navy, textDecoration: "none", fontSize: 12, fontWeight: 800 }}
                                >
                                  {cell}{parsed.meta.extension ? ` ext. ${parsed.meta.extension}` : ""}
                                </a>
                              ) : null}
                              {!cell && officePhone ? (
                                <a
                                  href={`tel:${officePhone.replace(/[^+\d]/g, "")}`}
                                  onClick={(event) => event.stopPropagation()}
                                  style={{ color: colors.navy, textDecoration: "none", fontSize: 12, fontWeight: 800 }}
                                >
                                  {officePhone}{parsed.meta.extension ? ` ext. ${parsed.meta.extension}` : ""}
                                </a>
                              ) : null}
                              {email ? (
                                <a
                                  href={`mailto:${email}`}
                                  onClick={(event) => event.stopPropagation()}
                                  style={{ color: colors.navy, textDecoration: "none", fontSize: 12, overflowWrap: "anywhere" }}
                                >
                                  {email}
                                </a>
                              ) : null}
                            </div>
                          ) : null}

                          {(relationSummary.length || parsed.meta.serviceAreas.length) ? (
                            <div
                              style={{
                                display: "flex",
                                gap: 5,
                                flexWrap: "wrap",
                                marginTop: 8,
                                paddingTop: 7,
                                borderTop: `1px solid ${colors.line}`,
                              }}
                            >
                              {relationSummary.map((item) => (
                                <span key={item} style={{ ...mutedSmallStyle, fontWeight: 800 }}>{item}</span>
                              ))}
                              {parsed.meta.serviceAreas.slice(0, 2).map((area) => (
                                <span key={area} style={badgeStyle("Monitor")}>{area}</span>
                              ))}
                              {parsed.meta.serviceAreas.length > 2 ? (
                                <span style={mutedSmallStyle}>+{parsed.meta.serviceAreas.length - 2}</span>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div style={noticeStyle}>No contacts saved yet.</div>
                )}
              </section>

              <section
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 12,
                  background: "#F8FAFC",
                  padding: 10,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))",
                    gap: 6,
                  }}
                >
                  {[
                    ["Assets", relatedVendorAssets.length],
                    ["Open Work", relatedVendorWorkOrders.filter((record) => record.status !== "Completed").length],
                    ["Tasks", relatedVendorTasks.length],
                    ["Visits", vendorCompletedVisitCount],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      style={{
                        border: `1px solid ${colors.line}`,
                        borderRadius: 9,
                        background: "#FFFFFF",
                        padding: "7px 8px",
                      }}
                    >
                      <span style={{ ...mutedSmallStyle, display: "block" }}>{label}</span>
                      <strong style={{ color: colors.navy, fontSize: 15 }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              {selectedVendorPhotos.length ? (
                <section style={detailSectionStyle}>
                  <div style={detailSectionHeaderStyle}>
                    <div>
                      <div style={eyebrowStyle}>Photos</div>
                      <strong>{selectedVendorPhotos.length} attached</strong>
                    </div>
                    <div style={buttonRowStyle}>
                      <button
                        type="button"
                        onClick={() => void pasteLinkedPhoto("Vendor", selectedVendor.id, selectedVendor.name)}
                        style={secondaryButtonStyle}
                      >
                        Paste Image
                      </button>
                      <label style={compactUploadButtonStyle}>
                        Add Photo
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => {
                            void addLinkedPhotoFiles(
                              "Vendor",
                              selectedVendor.id,
                              selectedVendor.name,
                              event.currentTarget.files,
                            );
                            event.currentTarget.value = "";
                          }}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 5 }}>
                    {selectedVendorPhotos.map((file: any) => (
                      <div
                        key={file.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0,1fr) auto",
                          gap: 8,
                          alignItems: "center",
                          border: `1px solid ${colors.line}`,
                          borderRadius: 9,
                          padding: "6px 8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openUploadedFile(file)}
                          style={{
                            border: 0,
                            background: "transparent",
                            padding: 0,
                            textAlign: "left",
                            color: colors.navy,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {file.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteLinkedImage(file)}
                          style={photoDeleteButtonStyle}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : vendorEditing ? (
                <section style={detailSectionStyle}>
                  <div style={detailSectionHeaderStyle}>
                    <div>
                      <div style={eyebrowStyle}>Photos</div>
                      <strong>No photos attached</strong>
                    </div>
                    <label style={compactUploadButtonStyle}>
                      Add Photo
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => {
                          void addLinkedPhotoFiles(
                            "Vendor",
                            selectedVendor.id,
                            selectedVendor.name,
                            event.currentTarget.files,
                          );
                          event.currentTarget.value = "";
                        }}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </section>
              ) : null}

              {relatedVendorWorkOrders.length ? (
                <section style={detailSectionStyle}>
                  <div style={detailSectionHeaderStyle}>
                    <div>
                      <div style={eyebrowStyle}>Service & Visit History</div>
                      <strong>
                        {vendorCompletedVisitCount} completed visit{vendorCompletedVisitCount === 1 ? "" : "s"}
                      </strong>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 7 }}>
                    {relatedVendorWorkOrders.slice(0, 8).map((record) => {
                      const serviceDate = String(
                        record.serviceHistory?.[0]?.completedAt ||
                          record.lastCompletedDate ||
                          record.date ||
                          "",
                      ).slice(0, 10);
                      return (
                        <button
                          key={record.id}
                          type="button"
                          className="atlas-gold-hover-card"
                          onClick={() => {
                            setSelectedServiceId(record.id);
                            setScreen("history");
                          }}
                          style={{
                            ...compactLinkedRowStyle,
                            width: "100%",
                            border: `1px solid ${colors.line}`,
                            borderRadius: 10,
                            padding: "8px 9px",
                          }}
                        >
                          <span>
                            <strong>{record.title}</strong>
                            <small style={mutedSmallStyle}>
                              {serviceDate ? formatDate(serviceDate) : "No service date"}
                              {record.assetId ? ` · ${assetName(record.assetId)}` : ""}
                            </small>
                          </span>
                          <span style={badgeStyle(record.status)}>{record.status}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {relatedVendorAssets.length ? (
                <section style={detailSectionStyle}>
                  <div style={eyebrowStyle}>Related Assets</div>
                  <div style={compactLinkedListStyle}>
                    {relatedVendorAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        className="atlas-gold-hover-card"
                        onClick={() => {
                          setSelectedAssetId(asset.id);
                          setScreen("assets");
                        }}
                        style={compactLinkedRowStyle}
                      >
                        <span>
                          <strong>{asset.name}</strong>
                          <small style={mutedSmallStyle}>{asset.category}</small>
                        </span>
                        <span style={badgeStyle(asset.status)}>{asset.status}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {relatedVendorTasks.length ? (
                <section style={detailSectionStyle}>
                  <div style={detailSectionHeaderStyle}>
                    <div>
                      <div style={eyebrowStyle}>Related Tasks</div>
                      <strong>{relatedVendorTasks.length} linked</strong>
                    </div>
                  </div>
                  <div style={compactLinkedListStyle}>
                    {relatedVendorTasks.map((task) => (
                      <button
                        key={`vendor-task-${task.id}`}
                        type="button"
                        className="atlas-gold-hover-card"
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setTasksView("tasks");
                          setScreen("planner");
                        }}
                        style={{ ...compactLinkedRowStyle, width: "100%" }}
                      >
                        <span>
                          <strong>{task.title}</strong>
                          <small style={mutedSmallStyle}>
                            {taskDetails(task.id).dueDate
                              ? formatDate(taskDetails(task.id).dueDate)
                              : "No due date"}
                          </small>
                        </span>
                        <span style={badgeStyle(taskDetails(task.id).status)}>
                          {taskDetails(task.id).status}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {renderLinkedDocuments("Vendor", selectedVendor.id)}

              {vendorEditing ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 7,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void deleteVendorRecord(selectedVendor)}
                    style={dangerButtonStyle}
                  >
                    Delete Vendor
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={noticeStyle}>
              <strong>Select a vendor.</strong>
              <p style={mutedSmallStyle}>
                Open a vendor to see company information, contacts, related assets, and documents.
              </p>
            </div>
          )
        }
      />

      {contactDraft ? (
        <div
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setContactDraft(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            display: "flex",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "center",
            padding: isMobile ? 8 : 18,
            background: "rgba(8, 28, 51, 0.48)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={contactMode === "new" ? "New Contact" : "Edit Contact"}
            style={{
              width: isMobile ? "100%" : "min(680px, 96vw)",
              maxHeight: isMobile ? "calc(100dvh - 16px)" : "90dvh",
              overflowY: "auto",
              borderRadius: 15,
              background: "#FFFFFF",
              boxShadow: "0 24px 80px rgba(8, 28, 51, 0.28)",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 3,
                minHeight: 56,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                borderBottom: `1px solid ${colors.line}`,
                background: "#FFFFFF",
              }}
            >
              <strong style={{ color: colors.navy, fontSize: 17 }}>
                {contactMode === "new" ? "New Contact" : "Edit Contact"}
              </strong>
              <button
                type="button"
                onClick={() => setContactDraft(null)}
                aria-label="Close contact editor"
                style={{
                  width: 34,
                  height: 34,
                  border: 0,
                  borderRadius: 8,
                  background: "transparent",
                  color: colors.navy,
                  fontSize: 24,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: isMobile ? 14 : 18, display: "grid", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 62,
                    height: 62,
                    flex: "0 0 62px",
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "#E8F1F6",
                    color: colors.navy,
                    fontSize: 26,
                    fontWeight: 900,
                  }}
                >
                  {(contactDraft.name.trim().slice(0, 1) || "C").toUpperCase()}
                </div>
                <div>
                  <strong style={{ color: colors.navy }}>Contact Info</strong>
                  <div style={{ ...mutedSmallStyle, marginTop: 2 }}>
                    Add the person you work with at {selectedVendor.name}.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
                  gap: 9,
                }}
              >
                <Field
                  label="Full Name"
                  value={contactDraft.name}
                  onChange={(value) => setContactDraft((current) => current ? { ...current, name: value } : current)}
                />
                <Field
                  label="Role / Title"
                  value={contactDraft.role}
                  onChange={(value) => setContactDraft((current) => current ? { ...current, role: value } : current)}
                />
                <label style={{ display: "grid", gap: 5 }}>
                  <span style={mutedSmallStyle}>Contact Type</span>
                  <select
                    value={contactDraft.contactType}
                    onChange={(event) =>
                      setContactDraft((current) => current ? { ...current, contactType: event.currentTarget.value as VendorContactCard["contactType"] } : current)
                    }
                    style={{ minHeight: 40, border: `1px solid ${colors.line}`, borderRadius: 9, padding: "7px 9px", background: "#FFFFFF" }}
                  >
                    {vendorDepartmentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 5 }}>
                  <span style={mutedSmallStyle}>Preferred Contact</span>
                  <select
                    value={contactDraft.preferredMethod}
                    onChange={(event) =>
                      setContactDraft((current) => current ? { ...current, preferredMethod: event.currentTarget.value as VendorContactCard["preferredMethod"] } : current)
                    }
                    style={{ minHeight: 40, border: `1px solid ${colors.line}`, borderRadius: 9, padding: "7px 9px", background: "#FFFFFF" }}
                  >
                    <option value="Cell">Cell</option>
                    <option value="Office">Office</option>
                    <option value="Email">Email</option>
                  </select>
                </label>
                <Field
                  label="Cell Phone"
                  value={contactDraft.cellPhone}
                  onChange={(value) => setContactDraft((current) => current ? { ...current, cellPhone: value, phone: value } : current)}
                />
                <Field
                  label="Office Phone"
                  value={contactDraft.officePhone}
                  onChange={(value) => setContactDraft((current) => current ? { ...current, officePhone: value } : current)}
                />
                <Field
                  label="Extension"
                  value={contactDraft.extension}
                  onChange={(value) => setContactDraft((current) => current ? { ...current, extension: value } : current)}
                />
                <Field
                  label="Email"
                  value={contactDraft.email}
                  onChange={(value) => setContactDraft((current) => current ? { ...current, email: value } : current)}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
                  gap: 9,
                }}
              >
                {relationshipDropdown(
                  "Assets",
                  "assetIds",
                  allAssetOptions.map((asset) => ({
                    id: asset.id,
                    label: asset.name,
                    detail: [asset.category, locationName((asset as any).locationId || "")].filter(Boolean).join(" · "),
                  })),
                )}
                {relationshipDropdown(
                  "Locations",
                  "locationIds",
                  locationOptions.map((location) => ({ id: location.id, label: location.name })),
                )}
                {relationshipDropdown(
                  "Service / Responsibility",
                  "serviceAreas",
                  vendorServiceAreas.map((area) => ({ id: area, label: area })),
                )}
                <label
                  style={{
                    minHeight: 40,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "7px 9px",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 9,
                    color: colors.navy,
                    fontWeight: 800,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={contactDraft.primary}
                    disabled={Boolean(contactDraft.inactive)}
                    onChange={(event) =>
                      setContactDraft((current) => current ? { ...current, primary: event.currentTarget.checked } : current)
                    }
                  />
                  Primary Contact
                </label>
              </div>

              <Field
                label="Notes"
                value={contactDraft.displayNotes}
                onChange={(value) => setContactDraft((current) => current ? { ...current, displayNotes: value } : current)}
                multiline
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                  paddingTop: 4,
                }}
              >
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {contactMode === "edit" ? (
                    <>
                      <button type="button" disabled={contactSaving} onClick={() => void archiveContact()} style={secondaryButtonStyle}>
                        {contactDraft.inactive ? "Restore" : "Archive"}
                      </button>
                      <button type="button" disabled={contactSaving} onClick={() => void deleteVendorContact()} style={dangerButtonStyle}>
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" disabled={contactSaving} onClick={() => setContactDraft(null)} style={secondaryButtonStyle}>
                    Cancel
                  </button>
                  <button type="button" disabled={contactSaving} onClick={() => void saveContact()} style={goldButtonStyle}>
                    {contactSaving ? "Saving…" : contactMode === "new" ? "Add Contact" : "Save Contact"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
