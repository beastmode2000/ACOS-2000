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

export default function AtlasVendorsWorkspace(props: any) {
  const [vendorSearch, setVendorSearch] = React.useState("");
  const [vendorEditing, setVendorEditing] = React.useState(false);
  const [showInactiveContacts, setShowInactiveContacts] = React.useState(false);
  const [editingVendorContactId, setEditingVendorContactId] = React.useState("");

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
    setEditingVendorContactId("");
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

  const updateVendorContacts = (contacts: VendorContactCard[]) => {
    updateVendor({ contacts });
  };

  const addVendorDepartment = () => {
    const contact: VendorContactCard = {
      id: uid("vendor-contact"),
      name: "",
      role: "",
      phone: "",
      officePhone: "",
      cellPhone: "",
      email: "",
      contactType: "Office",
      primary: vendorContacts.length === 0,
      preferredMethod: "Office",
      notes: "",
      inactive: false,
    };
    updateVendorContacts([...vendorContacts, contact]);
    setEditingVendorContactId(contact.id);
  };

  const updateVendorContact = (
    contactId: string,
    patch: Partial<VendorContactCard>,
  ) => {
    let next = vendorContacts.map((contact) => ({
      ...contact,
      ...(patch.primary ? { primary: false } : {}),
      ...(contact.id === contactId ? patch : {}),
    }));

    const updated = next.find((contact) => contact.id === contactId);
    if (updated?.inactive && updated.primary) {
      next = next.map((contact) =>
        contact.id === contactId ? { ...contact, primary: false } : contact,
      );
    }

    const activeContacts = next.filter((contact) => !contact.inactive);
    if (activeContacts.length && !activeContacts.some((contact) => contact.primary)) {
      const firstActiveId = activeContacts[0].id;
      next = next.map((contact) =>
        contact.id === firstActiveId ? { ...contact, primary: true } : contact,
      );
    }

    updateVendorContacts(next);
  };

  const deleteVendorContact = (contactId: string) => {
    if (!window.confirm("Delete this vendor department/contact?")) return;
    if (editingVendorContactId === contactId) setEditingVendorContactId("");

    let next = vendorContacts.filter((contact) => contact.id !== contactId);
    const activeContacts = next.filter((contact) => !contact.inactive);
    if (activeContacts.length && !activeContacts.some((contact) => contact.primary)) {
      const firstActiveId = activeContacts[0].id;
      next = next.map((contact) =>
        contact.id === firstActiveId ? { ...contact, primary: true } : contact,
      );
    }
    updateVendorContacts(next);
  };

  const relatedVendorAssets: AssetRecord[] = selectedVendor.id
    ? [...(assetRecords as AssetRecord[])]
        .filter((asset) => asset.vendorIds.includes(selectedVendor.id))
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        )
    : [];

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

  const selectedLogoSrc =
    selectedVendorLogo?.dataUrl || selectedVendorLogo?.url || "";

  return (
    <ListDrawerLayout
      eyebrow="Property Records"
      title="Vendors"
      isMobile={isMobile}
      drawerResetKey={selectedVendorId || "vendor-new"}
      gridStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              gridTemplateColumns: "minmax(300px, 340px) minmax(0, 1fr)",
              gap: 12,
              alignItems: "start",
            }
      }
      listPanelStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              minWidth: 0,
              height: "calc(100dvh - 190px)",
              maxHeight: "calc(100dvh - 190px)",
              overflowY: "auto",
              overflowX: "hidden",
              padding: 10,
            }
      }
      drawerStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              minWidth: 0,
              height: "calc(100dvh - 190px)",
              maxHeight: "calc(100dvh - 190px)",
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
                  borderColor:
                    vendor.id === selectedVendor.id ? colors.gold : colors.line,
                  background:
                    vendor.id === selectedVendor.id ? "#F4F8FD" : "#FFFFFF",
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
                    {vendor.category ? (
                      <p style={mutedSmallStyle}>{vendor.category}</p>
                    ) : null}
                    {[vendor.phone, vendor.email].filter(Boolean).length ? (
                      <p style={mutedSmallStyle}>
                        {[vendor.phone, vendor.email].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
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
            style={{ ...stackStyle, gap: 10, minWidth: 0 }}
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
                padding: isMobile ? 11 : 13,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "64px minmax(0,1fr)"
                    : "76px minmax(0,1fr) auto",
                  gap: 12,
                  alignItems: "center",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: isMobile ? 64 : 76,
                    height: isMobile ? 64 : 76,
                    borderRadius: 12,
                    border: `1px solid ${colors.line}`,
                    background: "#FFFFFF",
                    display: "grid",
                    placeItems: "center",
                    overflow: "hidden",
                    color: colors.navy,
                    fontWeight: 900,
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
                        padding: 6,
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <span>{selectedVendor.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      ...editorHeaderStyle,
                      margin: 0,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {selectedVendor.name.trim() || "Vendor"}
                  </h3>
                  {selectedVendor.category ? (
                    <div style={{ ...mutedSmallStyle, marginTop: 3 }}>
                      {selectedVendor.category}
                    </div>
                  ) : null}
                  <div style={{ ...mutedSmallStyle, marginTop: 4 }}>
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
                  <button
                    type="button"
                    onClick={() => setVendorEditing((current) => !current)}
                    style={secondaryButtonStyle}
                  >
                    {vendorEditing ? "Done" : "Edit"}
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
                    marginTop: 10,
                    paddingTop: 10,
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
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(2,minmax(0,1fr))",
                    gap: 9,
                  }}
                >
                  <Field
                    label="Name"
                    value={selectedVendor.name}
                    onChange={(value) => updateVendor({ name: value })}
                  />
                  <Field
                    label="Category"
                    value={selectedVendor.category}
                    onChange={(value) => updateVendor({ category: value })}
                  />
                  <Field
                    label="Main Phone"
                    value={selectedVendor.phone ?? ""}
                    onChange={(value) => updateVendor({ phone: value })}
                  />
                  <Field
                    label="Main Email"
                    value={selectedVendor.email ?? ""}
                    onChange={(value) => updateVendor({ email: value })}
                  />
                  <Field
                    label="Website"
                    value={selectedVendor.website ?? ""}
                    onChange={(value) => updateVendor({ website: value })}
                  />
                  <Field
                    label="Notes"
                    value={selectedVendor.notes ?? ""}
                    onChange={(value) => updateVendor({ notes: value })}
                    multiline
                  />
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(2,minmax(0,1fr))",
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
                  <div style={eyebrowStyle}>Departments & Contacts</div>
                  <strong>
                    {activeVendorContacts.length} active
                  </strong>
                </div>
                <div style={buttonRowStyle}>
                  {inactiveVendorContacts.length ? (
                    <button
                      type="button"
                      onClick={() => setShowInactiveContacts((current) => !current)}
                      style={secondaryButtonStyle}
                    >
                      {showInactiveContacts
                        ? "Hide inactive"
                        : `Inactive (${inactiveVendorContacts.length})`}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={addVendorDepartment}
                    style={goldButtonStyle}
                  >
                    + Add Department
                  </button>
                </div>
              </div>

              {visibleVendorContacts.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(2,minmax(0,1fr))",
                    gap: 9,
                  }}
                >
                  {visibleVendorContacts.map((contact) => {
                    const cell = String(contact.cellPhone || contact.phone || "").trim();
                    const officePhone = String(contact.officePhone || "").trim();
                    const email = String(contact.email || "").trim();
                    const role = String(contact.role || "").trim();
                    const notes = String(contact.notes || "").trim();
                    const name = String(contact.name || "").trim();
                    const isEditing = editingVendorContactId === contact.id;

                    return (
                      <article
                        key={contact.id}
                        style={{
                          border: `1px solid ${
                            contact.primary ? colors.gold : colors.line
                          }`,
                          borderRadius: 12,
                          background: contact.inactive
                            ? "#F8FAFC"
                            : contact.primary
                              ? "#FFFDF6"
                              : "#FFFFFF",
                          padding: 10,
                          minWidth: 0,
                          opacity: contact.inactive ? 0.7 : 1,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 8,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              <strong
                                style={{
                                  color: colors.navy,
                                  fontSize: 13,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {contact.contactType}
                              </strong>
                              {contact.primary ? (
                                <span style={badgeStyle("Preferred")}>Primary</span>
                              ) : null}
                              {contact.inactive ? (
                                <span style={badgeStyle("Monitor")}>Inactive</span>
                              ) : null}
                            </div>
                            {(name || role) ? (
                              <div style={{ ...mutedSmallStyle, marginTop: 3 }}>
                                {[name, role].filter(Boolean).join(" · ")}
                              </div>
                            ) : null}
                          </div>

                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => setEditingVendorContactId(contact.id)}
                              style={{
                                ...secondaryButtonStyle,
                                minHeight: 30,
                                padding: "4px 8px",
                              }}
                            >
                              Edit
                            </button>
                          ) : null}
                        </div>

                        {isEditing ? (
                          <>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: isMobile
                                  ? "1fr"
                                  : "repeat(2,minmax(0,1fr))",
                                gap: 8,
                                marginTop: 10,
                              }}
                            >
                              <label style={{ display: "grid", gap: 5 }}>
                                <span style={mutedSmallStyle}>Department</span>
                                <select
                                  value={contact.contactType}
                                  onChange={(event) =>
                                    updateVendorContact(contact.id, {
                                      contactType: event.currentTarget
                                        .value as VendorContactCard["contactType"],
                                    })
                                  }
                                  style={{
                                    width: "100%",
                                    minWidth: 0,
                                    minHeight: 40,
                                    border: `1px solid ${colors.line}`,
                                    borderRadius: 9,
                                    padding: "7px 9px",
                                    background: "#FFFFFF",
                                    color: colors.text,
                                  }}
                                >
                                  {vendorDepartmentTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <Field
                                label="Contact Name"
                                value={contact.name}
                                onChange={(value) =>
                                  updateVendorContact(contact.id, { name: value })
                                }
                              />
                              <Field
                                label="Role / Title"
                                value={contact.role}
                                onChange={(value) =>
                                  updateVendorContact(contact.id, { role: value })
                                }
                              />
                              <Field
                                label="Office Phone"
                                value={contact.officePhone}
                                onChange={(value) =>
                                  updateVendorContact(contact.id, {
                                    officePhone: value,
                                  })
                                }
                              />
                              <Field
                                label="Cell Phone"
                                value={contact.cellPhone || contact.phone}
                                onChange={(value) =>
                                  updateVendorContact(contact.id, {
                                    cellPhone: value,
                                    phone: value,
                                  })
                                }
                              />
                              <Field
                                label="Email"
                                value={contact.email}
                                onChange={(value) =>
                                  updateVendorContact(contact.id, { email: value })
                                }
                              />
                              <Field
                                label="Notes"
                                value={contact.notes}
                                onChange={(value) =>
                                  updateVendorContact(contact.id, { notes: value })
                                }
                                multiline
                              />
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                                marginTop: 9,
                              }}
                            >
                              <label
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  color: colors.navy,
                                  fontWeight: 800,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={contact.primary}
                                  disabled={Boolean(contact.inactive)}
                                  onChange={(event) =>
                                    updateVendorContact(contact.id, {
                                      primary: event.currentTarget.checked,
                                    })
                                  }
                                />
                                Primary
                              </label>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  onClick={() => setEditingVendorContactId("")}
                                  style={goldButtonStyle}
                                >
                                  Done
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateVendorContact(contact.id, {
                                      inactive: !contact.inactive,
                                    })
                                  }
                                  style={secondaryButtonStyle}
                                >
                                  {contact.inactive ? "Restore" : "Archive"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteVendorContact(contact.id)}
                                  style={dangerButtonStyle}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {(officePhone || cell || email) ? (
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: isMobile
                                    ? "1fr"
                                    : "repeat(2,minmax(0,1fr))",
                                  gap: 6,
                                  marginTop: 9,
                                }}
                              >
                                {officePhone
                                  ? infoCard(
                                      "Office",
                                      officePhone,
                                      `tel:${officePhone.replace(/[^+\d]/g, "")}`,
                                    )
                                  : null}
                                {cell
                                  ? infoCard(
                                      "Cell",
                                      cell,
                                      `tel:${cell.replace(/[^+\d]/g, "")}`,
                                    )
                                  : null}
                                {email
                                  ? infoCard("Email", email, `mailto:${email}`)
                                  : null}
                              </div>
                            ) : null}
                            {notes ? (
                              <div
                                style={{
                                  ...mutedSmallStyle,
                                  borderTop: `1px solid ${colors.line}`,
                                  marginTop: 8,
                                  paddingTop: 8,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {notes}
                              </div>
                            ) : null}
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div style={noticeStyle}>
                  No departments or contacts saved. Add only the departments this
                  vendor actually uses.
                </div>
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
                  gridTemplateColumns: isMobile
                    ? "repeat(2,minmax(0,1fr))"
                    : "repeat(4,minmax(0,1fr))",
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
                    <span style={{ ...mutedSmallStyle, display: "block" }}>
                      {label}
                    </span>
                    <strong style={{ color: colors.navy, fontSize: 15 }}>
                      {value}
                    </strong>
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
                      onClick={() =>
                        void pasteLinkedPhoto(
                          "Vendor",
                          selectedVendor.id,
                          selectedVendor.name,
                        )
                      }
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
                  {selectedVendorPhotos.map((file) => (
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
                      {vendorCompletedVisitCount} completed visit
                      {vendorCompletedVisitCount === 1 ? "" : "s"}
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
              Open a vendor to see company information, departments, contacts,
              related assets, and documents.
            </p>
          </div>
        )
      }
    />
  );
}
