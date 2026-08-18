"use client";

import React from "react";
import type { ContactRecord } from "../lib/atlas-types";
import { Field } from "./AtlasUiPrimitives";
import { ListDrawerLayout } from "./AtlasAppFoundation";

export default function AtlasContacts(props: any) {
  const {
    selectedContactId,
    setSelectedContactId,
    contactRecords,
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
    contactListShellStyle,
    filteredContacts,
    editContact,
    contactRowStyle,
    contactAvatarStyle,
    contactNameStyle,
    contactSecondaryLineStyle,
    noticeStyle,
    contactEditorOpen,
    setContactEditorOpen,
    stackStyle,
    contactDetailHeaderStyle,
    contactDraft,
    contactAvatarLargeStyle,
    editorHeaderStyle,
    badgeStyle,
    detailSectionStyle,
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

  const [directoryFilter, setDirectoryFilter] = React.useState<"All" | "Co-workers" | "Vendors" | "Contacts">("All");
  const [selectedCoworker, setSelectedCoworker] = React.useState<any>(null);

  const directorySearch = String(contactSearch || "").trim().toLowerCase();
  const visibleCoworkers = teamDirectory.filter((member: any) => {
    if (member.active === false) return false;
    if (member.propertyIds?.length && !member.propertyIds.includes(activePropertyId) && !["master", "administrator"].includes(member.role)) return false;
    return !directorySearch || [member.name, member.email, member.role].join(" ").toLowerCase().includes(directorySearch);
  });
  const visibleVendors = vendorRecords.filter((vendor: any) =>
    !directorySearch || [vendor.name, vendor.category, vendor.phone, vendor.email, vendor.website].join(" ").toLowerCase().includes(directorySearch),
  );

  const initials = (name: string, fallback = "C") =>
    String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.slice(0, 1).toUpperCase())
      .join("") || fallback;

  const selectedStoredContact = selectedContactId
    ? contactRecords.find((item: ContactRecord) => item.id === selectedContactId)
    : undefined;

  const contactSubtitle = (contact: ContactRecord) =>
    [contact.organization, contact.role, contact.category]
      .filter(Boolean)
      .join(" · ");

  return (
    <ListDrawerLayout
      eyebrow=""
      title="Contacts"
      detail=""
      isMobile={isMobile}
      drawerResetKey={selectedCoworker?.id || selectedContactId || "contact-new"}
      mobileDrawerOpen={isMobile && (contactEditorOpen || Boolean(selectedCoworker))}
      onMobileDrawerClose={() => {
        setSelectedCoworker(null);
        setContactEditorOpen(false);
        setSelectedContactId("");
      }}
      mobileDrawerTitle={selectedCoworker?.name || contactDraft.name || (selectedContactId ? "Contact" : "New Contact")}
      gridStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              gridTemplateColumns: "minmax(280px, 34%) minmax(0, 66%)",
              gap: 12,
              alignItems: "start",
            }
      }
      listPanelStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : { minWidth: 0, padding: 10 }
      }
      drawerStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              minWidth: 0,
              position: "sticky",
              top: 10,
              alignSelf: "start",
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
              overflowX: "visible",
            }
      }
      right={
        <button
          type="button"
          onClick={startNewContact}
          style={goldButtonStyle}
        >
          Add Contact
        </button>
      }
      list={
        <div style={{ ...stackStyle, gap: 8 }}>
          <div
            style={{
              ...cardStyle,
              padding: 10,
              position: isMobile ? "static" : "sticky",
              top: 0,
              zIndex: 4,
            }}
          >
            <input
              value={contactSearch}
              onChange={(event) => setContactSearch(event.currentTarget.value)}
              placeholder="Search people, companies, phone or email..."
              aria-label="Search contact book"
              style={{
                ...inputStyle,
                minHeight: 38,
                padding: "7px 10px",
              }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {(["All", "Co-workers", "Vendors", "Contacts"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setDirectoryFilter(filter)}
                  style={{
                    ...secondaryButtonStyle,
                    width: "auto",
                    minHeight: 34,
                    padding: "6px 9px",
                    background: directoryFilter === filter ? "#FFF4D6" : "#FFFFFF",
                    borderColor: directoryFilter === filter ? colors.gold : colors.line,
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...contactListShellStyle, gap: 5 }}>
            {(directoryFilter === "All" || directoryFilter === "Co-workers") && visibleCoworkers.length ? (
              <div style={{ display: "grid", gap: 5, marginBottom: 8 }}>
                <div style={{ ...eyebrowStyle, padding: "4px 2px" }}>Co-workers</div>
                {visibleCoworkers.map((member: any) => (
                  <button
                    key={`coworker-${member.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedCoworker(member);
                      setContactEditorOpen(false);
                      setSelectedContactId("");
                    }}
                    style={{ ...contactRowStyle, padding: "9px", borderRadius: 10, boxShadow: "none", borderColor: selectedCoworker?.id === member.id ? colors.gold : colors.line, background: selectedCoworker?.id === member.id ? "#FFF9EC" : "#FFFFFF" }}
                  >
                    <div style={contactAvatarStyle}>{initials(member.name, "T")}</div>
                    <div style={{ minWidth: 0 }}>
                      <strong style={contactNameStyle}>{member.name}</strong>
                      <p style={mutedSmallStyle}>{member.role || "Team member"}</p>
                      <p style={contactSecondaryLineStyle}>{member.email || "No email saved"}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {(directoryFilter === "All" || directoryFilter === "Vendors") && visibleVendors.length ? (
              <div style={{ display: "grid", gap: 5, marginBottom: 8 }}>
                <div style={{ ...eyebrowStyle, padding: "4px 2px" }}>Vendors</div>
                {visibleVendors.map((vendor: any) => (
                  <button key={`vendor-${vendor.id}`} type="button" onClick={() => openVendor?.(vendor.id)} style={{ ...contactRowStyle, padding: "9px", borderRadius: 10, boxShadow: "none", borderColor: colors.line, background: "#FFFFFF" }}>
                    <div style={contactAvatarStyle}>{initials(vendor.name, "V")}</div>
                    <div style={{ minWidth: 0 }}>
                      <strong style={contactNameStyle}>{vendor.name}</strong>
                      <p style={mutedSmallStyle}>{vendor.category || "Vendor"}</p>
                      <p style={contactSecondaryLineStyle}>{[vendor.phone, vendor.email].filter(Boolean).join(" · ") || "No phone or email saved"}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {directoryFilter === "All" || directoryFilter === "Contacts" ? (
              <div style={{ display: "grid", gap: 5 }}>
                <div style={{ ...eyebrowStyle, padding: "4px 2px" }}>Contacts</div>
            {filteredContacts.length ? (
              filteredContacts.map((contact: ContactRecord) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => {
                    setSelectedCoworker(null);
                    editContact(contact);
                  }}
                  style={{
                    ...contactRowStyle,
                    padding: "8px 9px",
                    minHeight: 0,
                    borderRadius: 10,
                    boxShadow: "none",
                    borderColor:
                      contact.id === selectedContactId
                        ? colors.gold
                        : colors.line,
                    background:
                      contact.id === selectedContactId ? "#FFF9EC" : "#FFFFFF",
                  }}
                >
                  <div style={contactAvatarStyle}>
                    {contact.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part.slice(0, 1).toUpperCase())
                      .join("") || "C"}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <strong style={contactNameStyle}>{contact.name}</strong>
                    {contactSubtitle(contact) ? (
                      <p style={mutedSmallStyle}>{contactSubtitle(contact)}</p>
                    ) : null}
                    <p style={contactSecondaryLineStyle}>
                      {[contact.phone, contact.email].filter(Boolean).join(" · ") ||
                        "No phone or email saved"}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div style={noticeStyle}>
                {contactSearch
                  ? "No contacts match this search."
                  : "No contacts have been added yet."}
              </div>
            )}
              </div>
            ) : null}
          </div>
        </div>
      }
      drawer={
        selectedCoworker ? (
          <div style={{ ...stackStyle, gap: 12 }}>
            <div style={contactDetailHeaderStyle}>
              <div style={contactAvatarLargeStyle}>{initials(selectedCoworker.name, "T")}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={editorHeaderStyle}>{selectedCoworker.name}</h3>
                <p style={mutedSmallStyle}>{selectedCoworker.role || "Team member"}</p>
                <span style={badgeStyle(selectedCoworker.active === false ? "Monitor" : "Completed")}>
                  {selectedCoworker.active === false ? "Inactive" : "Active co-worker"}
                </span>
              </div>
            </div>
            <section style={{ ...detailSectionStyle, padding: 14 }}>
              <div style={eyebrowStyle}>Contact Information</div>
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                <div><strong style={{ display: "block", color: colors.navy }}>Email</strong><span style={mutedSmallStyle}>{selectedCoworker.email || "No email saved"}</span></div>
                <div><strong style={{ display: "block", color: colors.navy }}>Role</strong><span style={mutedSmallStyle}>{selectedCoworker.role || "Not assigned"}</span></div>
                <div><strong style={{ display: "block", color: colors.navy }}>Property access</strong><span style={mutedSmallStyle}>{selectedCoworker.propertyIds?.length ? selectedCoworker.propertyIds.join(" · ") : "All assigned properties"}</span></div>
              </div>
              {selectedCoworker.email ? (
                <div style={{ ...buttonRowStyle, marginTop: 14 }}>
                  <a href={`mailto:${selectedCoworker.email}`} style={secondaryButtonStyle}>Email</a>
                  <button type="button" onClick={() => void navigator.clipboard?.writeText(selectedCoworker.email)} style={secondaryButtonStyle}>Copy Email</button>
                </div>
              ) : null}
            </section>
          </div>
        ) : contactEditorOpen ? (
          <div style={{ ...stackStyle, gap: 10 }}>
            <div style={contactDetailHeaderStyle}>
              <div style={contactAvatarLargeStyle}>
                {contactDraft.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part: string) => part.slice(0, 1).toUpperCase())
                  .join("") || "C"}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={editorHeaderStyle}>
                  {contactDraft.name.trim() ||
                    (selectedContactId ? "Edit Contact" : "New Contact")}
                </h3>
                <p style={mutedSmallStyle}>
                  {contactSubtitle(contactDraft) || "Add contact information below."}
                </p>

                {contactDraft.organization.trim() || contactDraft.role.trim() ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 8,
                    }}
                  >
                    {contactDraft.organization.trim() ? (
                      <span style={badgeStyle("Monitor")}>
                        {contactDraft.organization}
                      </span>
                    ) : null}
                    {contactDraft.role.trim() ? (
                      <span style={badgeStyle("Normal")}>
                        {contactDraft.role}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {contactDraft.phone.trim() ||
            contactDraft.email.trim() ||
            contactDraft.website.trim() ||
            contactDraft.address.trim() ? (
              <section style={{ ...detailSectionStyle, padding: 12 }}>
                <div style={eyebrowStyle}>Quick Actions</div>
                <div style={{ ...buttonRowStyle, marginTop: 8 }}>
                  {contactDraft.phone.trim() ? (
                    <a
                      href={`tel:${contactDraft.phone.replace(/[^+\d]/g, "")}`}
                      style={secondaryButtonStyle}
                    >
                      Call
                    </a>
                  ) : null}

                  {contactDraft.email.trim() ? (
                    <a
                      href={`mailto:${contactDraft.email.trim()}`}
                      style={secondaryButtonStyle}
                    >
                      Email
                    </a>
                  ) : null}

                  {contactDraft.website.trim() ? (
                    <a
                      href={
                        /^https?:\/\//i.test(contactDraft.website.trim())
                          ? contactDraft.website.trim()
                          : `https://${contactDraft.website.trim()}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={secondaryButtonStyle}
                    >
                      Website
                    </a>
                  ) : null}

                  {contactDraft.email.trim() ? (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard
                          ?.writeText(contactDraft.email.trim())
                          .then(() => setContactMessage("Email copied."))
                          .catch(() =>
                            setContactMessage("Atlas could not copy the email."),
                          );
                      }}
                      style={secondaryButtonStyle}
                    >
                      Copy Email
                    </button>
                  ) : null}

                  {contactDraft.address.trim() ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        contactDraft.address.trim(),
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={secondaryButtonStyle}
                    >
                      Open Address
                    </a>
                  ) : null}
                </div>
              </section>
            ) : null}

            {contactMessage ? (
              <div style={noticeStyle}>{contactMessage}</div>
            ) : null}

            <section style={detailSectionStyle}>
              <div style={eyebrowStyle}>Contact Information</div>

              <div style={formGridStyle}>
                <Field
                  label="Name"
                  value={contactDraft.name}
                  onChange={(name) => updateContactDraft({ name })}
                />
                <Field
                  label="Company / Organization"
                  value={contactDraft.organization}
                  onChange={(organization) =>
                    updateContactDraft({ organization })
                  }
                />
                <Field
                  label="Role / Title"
                  value={contactDraft.role}
                  onChange={(role) => updateContactDraft({ role })}
                />
                <Field
                  label="Category"
                  value={contactDraft.category}
                  onChange={(category) => updateContactDraft({ category })}
                />
                <Field
                  label="Phone Number"
                  value={contactDraft.phone}
                  onChange={(phone) => updateContactDraft({ phone })}
                />
                <Field
                  label="Email Address"
                  value={contactDraft.email}
                  onChange={(email) => updateContactDraft({ email })}
                />
                <Field
                  label="Address"
                  value={contactDraft.address}
                  onChange={(address) => updateContactDraft({ address })}
                />
                <Field
                  label="Website"
                  value={contactDraft.website}
                  onChange={(website) => updateContactDraft({ website })}
                />
                <Field
                  label="Birthday"
                  value={contactDraft.birthday}
                  onChange={(birthday) => updateContactDraft({ birthday })}
                  type="date"
                />
                <Field
                  label="Notes"
                  value={contactDraft.notes}
                  onChange={(notes) => updateContactDraft({ notes })}
                  multiline
                />
              </div>

              <div style={{ ...buttonRowStyle, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={saveContact}
                  style={goldButtonStyle}
                >
                  Save Contact
                </button>

                {selectedStoredContact ? (
                  <button
                    type="button"
                    onClick={() => deleteContact(selectedStoredContact)}
                    style={dangerButtonStyle}
                  >
                    Delete Contact
                  </button>
                ) : null}
              </div>
            </section>
          </div>
        ) : (
          <div style={noticeStyle}>
            <strong>Select a contact or add a new one.</strong>
            <p style={mutedSmallStyle}>
              Contact details remain fully editable.
            </p>
          </div>
        )
      }
    />
  );
}
