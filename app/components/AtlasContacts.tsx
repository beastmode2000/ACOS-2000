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
      ? contactRecords.find((item) => item.id === selectedContactId)
      : undefined;

    const contactSubtitle = (contact: ContactRecord) =>
      [contact.organization, contact.role, contact.category]
        .filter(Boolean)
        .join(" · ");

    const contactOrganizations = new Set(
      contactRecords
        .map((contact) => contact.organization.trim().toLowerCase())
        .filter(Boolean),
    ).size;
    const reachableContacts = contactRecords.filter(
      (contact) => contact.phone.trim() || contact.email.trim(),
    ).length;
    const completeContacts = contactRecords.filter(
      (contact) => contact.phone.trim() && contact.email.trim(),
    ).length;
    const missingContactDetails = Math.max(
      0,
      contactRecords.length - reachableContacts,
    );

    const contactSummaryCards = [
      {
        label: "Total contacts",
        value: contactRecords.length,
        detail: "People saved in Atlas",
      },
      {
        label: "Organizations",
        value: contactOrganizations,
        detail: "Companies and groups",
      },
      {
        label: "Phone + email",
        value: completeContacts,
        detail: "Fully reachable contacts",
      },
      {
        label: "Missing details",
        value: missingContactDetails,
        detail: "No phone or email saved",
      },
    ];

    return (
      <ListDrawerLayout
        eyebrow="People & Companies"
        title="Contacts"
        detail="Coworkers, vendors, carriers, contractors, and other useful contacts in alphabetical order."
        isMobile={isMobile}
        drawerResetKey={selectedContactId || "contact-new"}
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
          <div style={stackStyle}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {contactSummaryCards.map((card) => (
                <div
                  key={card.label}
                  style={{
                    border: `1px solid ${colors.line}`,
                    borderRadius: 14,
                    background: colors.card,
                    padding: isMobile ? 12 : 14,
                    minWidth: 0,
                    boxShadow: "0 7px 20px rgba(15, 35, 65, 0.06)",
                  }}
                >
                  <div style={eyebrowStyle}>{card.label}</div>
                  <div
                    style={{
                      marginTop: 4,
                      color: colors.navy,
                      fontSize: isMobile ? 24 : 28,
                      lineHeight: 1,
                      fontWeight: 950,
                    }}
                  >
                    {card.value}
                  </div>
                  <p style={{ ...mutedSmallStyle, marginTop: 6 }}>
                    {card.detail}
                  </p>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <input
                value={contactSearch}
                onChange={(event) =>
                  setContactSearch(event.currentTarget.value)
                }
                placeholder="Search contacts..."
                style={inputStyle}
              />
            </div>

            <div style={contactListShellStyle}>
              {filteredContacts.length ? (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => editContact(contact)}
                    style={{
                      ...contactRowStyle,
                      borderColor:
                        contact.id === selectedContactId
                          ? colors.gold
                          : "transparent",
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
                        <p style={mutedSmallStyle}>
                          {contactSubtitle(contact)}
                        </p>
                      ) : null}
                      <p style={contactSecondaryLineStyle}>
                        {[contact.phone, contact.email]
                          .filter(Boolean)
                          .join(" · ") || "No phone or email saved"}
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
            <div style={stackStyle}>
              <div style={contactDetailHeaderStyle}>
                <div style={contactAvatarLargeStyle}>
                  {contactDraft.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part.slice(0, 1).toUpperCase())
                    .join("") || "C"}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={editorHeaderStyle}>
                    {contactDraft.name.trim() ||
                      (selectedContactId ? "Edit Contact" : "New Contact")}
                  </h3>
                  <p style={mutedSmallStyle}>
                    {contactSubtitle(contactDraft) ||
                      "Add contact information below."}
                  </p>
                  {(contactDraft.organization.trim() || contactDraft.role.trim()) ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 9,
                      }}
                    >
                      {contactDraft.organization.trim() ? (
                        <span style={badgeStyle("Monitor")}>Organization: {contactDraft.organization}</span>
                      ) : null}
                      {contactDraft.role.trim() ? (
                        <span style={badgeStyle("Normal")}>Role: {contactDraft.role}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {(contactDraft.phone.trim() ||
                contactDraft.email.trim() ||
                contactDraft.website.trim() ||
                contactDraft.address.trim()) ? (
                <section style={detailSectionStyle}>
                  <div style={eyebrowStyle}>Quick Actions</div>
                  <div style={buttonRowStyle}>
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
                            .catch(() => setContactMessage("Atlas could not copy the email."));
                        }}
                        style={secondaryButtonStyle}
                      >
                        Copy Email
                      </button>
                    ) : null}
                    {contactDraft.address.trim() ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactDraft.address.trim())}`}
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

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={saveContact}
                    style={goldButtonStyle}
                  >
                    Save Contact
                  </button>

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
                Contacts stay alphabetized automatically and every field is
                editable.
              </p>
            </div>
          )
        }
      />
    );

}
