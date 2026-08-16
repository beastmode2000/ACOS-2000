"use client";

import React from "react";
import type { ContactRecord } from "../lib/atlas-types";
import { Field } from "./AtlasUiPrimitives";
import { ListDrawerLayout } from "./AtlasAppFoundation";

export default function AtlasContacts(props: any) {
  const {
    selectedContactId,
    contactRecords,
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
      drawerResetKey={selectedContactId || "contact-new"}
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
          : { minWidth: 0, maxWidth: 340, padding: 10 }
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
              overflowX: "hidden",
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
              placeholder="Search contacts..."
              aria-label="Search contacts"
              style={{
                ...inputStyle,
                minHeight: 38,
                padding: "7px 10px",
              }}
            />
          </div>

          <div style={{ ...contactListShellStyle, gap: 5 }}>
            {filteredContacts.length ? (
              filteredContacts.map((contact: ContactRecord) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => editContact(contact)}
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
        </div>
      }
      drawer={
        contactEditorOpen ? (
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
