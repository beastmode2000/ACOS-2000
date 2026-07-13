"use client";

import React from "react";
import type { IntakeTargetKind } from "../lib/atlas-types";

type Props = {
  Field: any;
  ListDrawerLayout: any;
  allDocuments: any;
  buttonRowStyle: any;
  cardStyle: any;
  colors: any;
  deleteSelectedDocument: any;
  documentSearch: any;
  documentSyncStatus: any;
  documentTargetOptionsFor: any;
  editorHeaderStyle: any;
  eyebrowStyle: any;
  fieldLabelStyle: any;
  fileTileStyle: any;
  formGridStyle: any;
  goldButtonStyle: any;
  inputStyle: any;
  isMobile: any;
  listStyle: any;
  mutedSmallStyle: any;
  noticeStyle: any;
  openDocumentTarget: any;
  openUploadedFile: any;
  photoCardStyle: any;
  photoGridStyle: any;
  photoStyle: any;
  refreshDocumentVault: any;
  rowButtonStyle: any;
  saveSelectedDocument: any;
  secondaryButtonStyle: any;
  selectedDocumentId: any;
  setDocumentSearch: any;
  setScreen: any;
  setSelectedDocumentId: any;
  stackStyle: any;
  targetNameFor: any;
  tinyDangerButtonStyle: any;
  updateSelectedDocument: any;
};

export default function AtlasDocuments({
  Field,
  ListDrawerLayout,
  allDocuments,
  buttonRowStyle,
  cardStyle,
  colors,
  deleteSelectedDocument,
  documentSearch,
  documentSyncStatus,
  documentTargetOptionsFor,
  editorHeaderStyle,
  eyebrowStyle,
  fieldLabelStyle,
  fileTileStyle,
  formGridStyle,
  goldButtonStyle,
  inputStyle,
  isMobile,
  listStyle,
  mutedSmallStyle,
  noticeStyle,
  openDocumentTarget,
  openUploadedFile,
  photoCardStyle,
  photoGridStyle,
  photoStyle,
  refreshDocumentVault,
  rowButtonStyle,
  saveSelectedDocument,
  secondaryButtonStyle,
  selectedDocumentId,
  setDocumentSearch,
  setScreen,
  setSelectedDocumentId,
  stackStyle,
  targetNameFor,
  tinyDangerButtonStyle,
  updateSelectedDocument,
}: Props) {
    const normalizedDocumentSearch = documentSearch.trim().toLowerCase();
    const sortedDocuments = [...allDocuments].sort(
      (a, b) =>
        a.title.localeCompare(b.title) ||
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
    const searchableDocuments = sortedDocuments.filter((doc) => {
      if (!normalizedDocumentSearch) return true;
      const fileNames = (doc.files || []).map((file) => file.name).join(" ");
      return [
        doc.title,
        doc.type,
        doc.area,
        doc.targetType,
        doc.targetName,
        doc.notes,
        doc.pastedText,
        fileNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedDocumentSearch);
    });

    const selectedDocument =
      searchableDocuments.find((doc) => doc.id === selectedDocumentId) || null;
    const selectedTargetKind = (selectedDocument?.targetType ||
      "General") as IntakeTargetKind;
    const selectedTargetOptions = documentTargetOptionsFor(selectedTargetKind);

    function retargetSelectedDocument(kind: IntakeTargetKind) {
      if (!selectedDocument) return;
      const options = documentTargetOptionsFor(kind);
      const nextId = kind === "General" ? "" : options[0]?.id || "";
      const nextName = targetNameFor(kind, nextId);
      updateSelectedDocument(selectedDocument.id, {
        targetType: kind,
        targetId: nextId,
        targetName: nextName,
        area: nextName,
        linkedAssetId: kind === "Asset" ? nextId : undefined,
        linkedVendorId: kind === "Vendor" ? nextId : undefined,
      });
    }

    function retargetSelectedRecord(id: string) {
      if (!selectedDocument) return;
      const nextName = targetNameFor(selectedTargetKind, id);
      updateSelectedDocument(selectedDocument.id, {
        targetId: id,
        targetName: nextName,
        area: nextName,
        linkedAssetId: selectedTargetKind === "Asset" ? id : undefined,
        linkedVendorId: selectedTargetKind === "Vendor" ? id : undefined,
      });
    }

    return (
      <ListDrawerLayout
        eyebrow="Document Vault"
        title="Documents / Photos"
        detail="Search, open, edit, delete, zoom, and sync paperwork, photos, scans, PDFs, receipts, invoices, notes, and screenshots between phone and desktop."
        isMobile={isMobile}
        right={
          <>
            <button
              type="button"
              onClick={() => setScreen("manuals")}
              style={secondaryButtonStyle}
            >
              Manual Library
            </button>
            <button
              type="button"
              onClick={() => setScreen("intake")}
              style={goldButtonStyle}
            >
              Add Document
            </button>
          </>
        }
        list={
          <div style={stackStyle}>
            <div style={cardStyle}>
              <div style={eyebrowStyle}>Look Up Documents</div>
              <input
                value={documentSearch}
                onChange={(event) =>
                  setDocumentSearch(event.currentTarget.value)
                }
                placeholder="Search title, vendor, asset, notes, file name..."
                style={inputStyle}
              />
              <div style={{ ...buttonRowStyle, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => void refreshDocumentVault()}
                  style={secondaryButtonStyle}
                >
                  Refresh Vault
                </button>
                <button
                  type="button"
                  onClick={() => setScreen("intake")}
                  style={goldButtonStyle}
                >
                  Add Document
                </button>
              </div>
              <p style={mutedSmallStyle}>
                {searchableDocuments.length} matching document(s), sorted A–Z.
              </p>
              <p style={mutedSmallStyle}>{documentSyncStatus}</p>
            </div>

            {!searchableDocuments.length ? (
              <div style={noticeStyle}>
                <strong>No saved documents found.</strong>
                <p style={mutedSmallStyle}>
                  Use Add Document to take a phone photo, upload a PDF/image, or
                  paste notes and link them to an Atlas record.
                </p>
                <button
                  type="button"
                  onClick={() => setScreen("intake")}
                  style={goldButtonStyle}
                >
                  Add Document
                </button>
              </div>
            ) : (
              <div style={listStyle}>
                {searchableDocuments.map((document) => {
                  const fileCount = (document.files || []).length;
                  const hasPreview =
                    fileCount > 0 ||
                    Boolean(document.pastedText || document.href);
                  return (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => setSelectedDocumentId(document.id)}
                      style={{
                        ...rowButtonStyle,
                        borderColor:
                          selectedDocument?.id === document.id
                            ? colors.gold
                            : colors.line,
                        boxShadow:
                          selectedDocument?.id === document.id
                            ? "0 14px 30px rgba(201,154,61,0.18)"
                            : rowButtonStyle.boxShadow,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong>{document.title}</strong>
                        <p style={mutedSmallStyle}>
                          {document.type} · {document.area}
                        </p>
                        {document.targetType ? (
                          <p style={mutedSmallStyle}>
                            Linked to {document.targetType}:{" "}
                            {document.targetName || document.area}
                          </p>
                        ) : null}
                        <p style={mutedSmallStyle}>
                          {hasPreview
                            ? `${fileCount} file(s) / preview available`
                            : "Text-only record"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        }
        drawer={
          <div>
            {selectedDocument ? (
              <div style={stackStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <h3 style={editorHeaderStyle}>
                      {selectedDocument.title.trim() || "Document"}
                    </h3>
                    <p style={mutedSmallStyle}>
                      {selectedDocument.createdAt
                        ? `Saved ${new Date(selectedDocument.createdAt).toLocaleString()}`
                        : "Saved document"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void deleteSelectedDocument(selectedDocument)
                    }
                    style={tinyDangerButtonStyle}
                    title="Delete document"
                  >
                    × Delete
                  </button>
                </div>

                <div style={formGridStyle}>
                  <Field
                    label="Title"
                    value={selectedDocument.title}
                    onChange={(value) =>
                      updateSelectedDocument(selectedDocument.id, {
                        title: value,
                      })
                    }
                  />
                  <Field
                    label="Type"
                    value={selectedDocument.type}
                    onChange={(value) =>
                      updateSelectedDocument(selectedDocument.id, {
                        type: value,
                      })
                    }
                    placeholder="Invoice, Manual, Photo, Receipt, Estimate..."
                  />
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Linked section</span>
                    <select
                      value={selectedTargetKind}
                      onChange={(event) =>
                        retargetSelectedDocument(
                          event.currentTarget.value as IntakeTargetKind,
                        )
                      }
                      style={inputStyle}
                    >
                      {(
                        [
                          "Asset",
                          "Location",
                          "Vendor",
                          "Work Order",
                          "Map Label",
                          "General",
                        ] as IntakeTargetKind[]
                      ).map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedTargetKind !== "General" ? (
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Linked record</span>
                      <select
                        value={selectedDocument.targetId || ""}
                        onChange={(event) =>
                          retargetSelectedRecord(event.currentTarget.value)
                        }
                        style={inputStyle}
                      >
                        {selectedTargetOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <Field
                    label="Notes"
                    value={selectedDocument.notes || ""}
                    onChange={(value) =>
                      updateSelectedDocument(selectedDocument.id, {
                        notes: value,
                      })
                    }
                    multiline
                    placeholder="What is this, why it matters, follow-up needed..."
                  />
                  <Field
                    label="Pasted text / copied paperwork"
                    value={selectedDocument.pastedText || ""}
                    onChange={(value) =>
                      updateSelectedDocument(selectedDocument.id, {
                        pastedText: value,
                      })
                    }
                    multiline
                    placeholder="Paste copied text, email content, invoice notes, serial info, etc."
                  />
                </div>

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() => void saveSelectedDocument(selectedDocument)}
                    style={goldButtonStyle}
                  >
                    Save Changes
                  </button>
                  {selectedDocument.targetType &&
                  selectedDocument.targetType !== "General" ? (
                    <button
                      type="button"
                      onClick={() => openDocumentTarget(selectedDocument)}
                      style={secondaryButtonStyle}
                    >
                      Open Linked Record
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelectedDocumentId("")}
                    style={secondaryButtonStyle}
                  >
                    Close
                  </button>
                </div>

                {selectedDocument.files?.length ? (
                  <div>
                    <div style={eyebrowStyle}>Files</div>
                    <div style={photoGridStyle}>
                      {selectedDocument.files.map((file) => (
                        <div key={file.id} style={photoCardStyle}>
                          <button
                            type="button"
                            onClick={() => openUploadedFile(file)}
                            style={{
                              border: 0,
                              background: "transparent",
                              padding: 0,
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                          >
                            {file.dataUrl?.startsWith("data:image/") ? (
                              <img
                                src={file.dataUrl}
                                alt={file.name}
                                style={photoStyle}
                              />
                            ) : (
                              <div style={fileTileStyle}>
                                {file.type?.includes("pdf") ? "PDF" : "FILE"}
                              </div>
                            )}
                            <strong>{file.name}</strong>
                            <span style={mutedSmallStyle}>
                              Open zoom preview
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedDocument(selectedDocument.id, {
                                files: (selectedDocument.files || []).filter(
                                  (item) => item.id !== file.id,
                                ),
                              })
                            }
                            style={tinyDangerButtonStyle}
                          >
                            Remove file
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={noticeStyle}>
                    <strong>No file attached.</strong>
                    <p style={mutedSmallStyle}>
                      This record can still hold notes/pasted text. Add a new
                      document if you need to attach a photo, PDF, or file.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={noticeStyle}>
                <strong>Select a document from the list.</strong>
                <p style={mutedSmallStyle}>
                  After you save a new upload, this info area closes so it is
                  ready for the next item. Click any document to view, edit,
                  zoom, or delete it.
                </p>
                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() => setScreen("intake")}
                    style={goldButtonStyle}
                  >
                    Add Document
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshDocumentVault()}
                    style={secondaryButtonStyle}
                  >
                    Refresh Vault
                  </button>
                </div>
              </div>
            )}
          </div>
        }
      />
    );
  
}
