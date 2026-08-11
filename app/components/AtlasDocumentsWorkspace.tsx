"use client";

import React, { useMemo, useState } from "react";
import type { DocumentRecord, IntakeTargetKind } from "../lib/atlas-types";
import { colors } from "../lib/atlas-page-config";
import { formatDate } from "./AtlasAppFoundation";

export default function AtlasDocumentsWorkspace(props: any) {
  const {
    allDocuments = [],
    assetRecords = [],
    locations = [],
    vendorRecords = [],
    serviceRecords = [],
    documentCategoryFilter = "All",
    documentLinkFilter = "All",
    documentSearch = "",
    documentSort = "recent",
    documentTargetOptionsFor = () => [],
    favoriteDocumentIds = [],
    recentDocumentIds = [],
    selectedDocumentFileIndex = 0,
    selectedDocumentId = "",
    blueprintPage = 1,
    isMobile = false,
    mutedSmallStyle = {},
    noticeStyle = {},
    goldButtonStyle = {},
    secondaryButtonStyle = {},
    smallSubtleButtonStyle = {},
    inputStyle = {},
    fieldLabelStyle = {},
    editorHeaderStyle = {},
    eyebrowStyle = {},
    cardStyle = {},
    fileTileStyle = {},
    buttonRowStyle = {},
    setDocumentCategoryFilter = () => undefined,
    setDocumentLinkFilter = () => undefined,
    setDocumentSearch = () => undefined,
    setDocumentSort = () => undefined,
    setFavoriteDocumentIds = () => undefined,
    setRecentDocumentIds = () => undefined,
    setSelectedDocumentFileIndex = () => undefined,
    setSelectedDocumentId = () => undefined,
    setBlueprintPage = () => undefined,
    setIntakeTitle = () => undefined,
    setIntakeType = () => undefined,
    setIntakeTargetKind = () => undefined,
    setIntakeNotes = () => undefined,
    setScreen = () => undefined,
    updateSelectedDocument = () => undefined,
    saveSelectedDocument = async () => undefined,
    deleteSelectedDocument = async () => undefined,
    openUploadedFile = () => undefined,
    openFileInBrowser = () => undefined,
    openDocumentTarget = () => undefined,
    replaceSelectedDocumentFile = () => undefined,
    targetNameFor = () => "",
  } = props;

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const logoRegex = /(^|\s|[-_/])logos?(\s|$|[-_/])/i;

  const visibleDocuments = useMemo(() => {
    const search = String(documentSearch || "").trim().toLowerCase();

    return (allDocuments as DocumentRecord[])
      .filter((doc) => {
        const fileNames = (doc.files || []).map((file) => file.name).join(" ");
        const haystack = [
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
          .toLowerCase();

        // Logos are intentionally excluded from normal Atlas browsing.
        if (logoRegex.test(haystack)) return false;

        const category = doc.type?.trim() || "Uncategorized";
        const linkType = doc.targetType?.trim() || "General";

        if (
          documentCategoryFilter !== "All" &&
          category !== documentCategoryFilter
        ) {
          return false;
        }
        if (documentLinkFilter !== "All" && linkType !== documentLinkFilter) {
          return false;
        }
        if (search && !haystack.includes(search)) return false;
        return true;
      })
      .sort((a, b) => {
        if (documentSort === "title") return a.title.localeCompare(b.title);
        if (documentSort === "category") {
          return (
            String(a.type || "").localeCompare(String(b.type || "")) ||
            a.title.localeCompare(b.title)
          );
        }
        return (
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")) ||
          a.title.localeCompare(b.title)
        );
      });
  }, [
    allDocuments,
    documentSearch,
    documentCategoryFilter,
    documentLinkFilter,
    documentSort,
  ]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          visibleDocuments.map((doc) => doc.type?.trim() || "Uncategorized"),
        ),
      ).sort(),
    [visibleDocuments],
  );

  const linkTypes = useMemo(
    () =>
      Array.from(
        new Set(
          visibleDocuments.map(
            (doc) => doc.targetType?.trim() || "General",
          ),
        ),
      ).sort(),
    [visibleDocuments],
  );

  const selectedDocument =
    (allDocuments as DocumentRecord[]).find(
      (doc) => doc.id === selectedDocumentId,
    ) || null;

  const selectedFiles = selectedDocument?.files || [];
  const safeFileIndex = Math.min(
    Math.max(0, Number(selectedDocumentFileIndex) || 0),
    Math.max(0, selectedFiles.length - 1),
  );
  const selectedFile = selectedFiles[safeFileIndex] || null;
  const selectedSource =
    selectedFile?.url || selectedFile?.dataUrl || selectedDocument?.href || "";
  const selectedType = String(selectedFile?.type || "").toLowerCase();
  const selectedName = String(selectedFile?.name || "").toLowerCase();
  const selectedIsImage =
    selectedType.startsWith("image/") ||
    selectedSource.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|avif|svg)$/.test(selectedName);
  const selectedIsPdf =
    selectedType.includes("pdf") ||
    selectedSource.startsWith("data:application/pdf") ||
    selectedName.endsWith(".pdf") ||
    String(selectedDocument?.href || "").toLowerCase().includes(".pdf");

  const selectedTargetKind = (selectedDocument?.targetType ||
    "General") as IntakeTargetKind;
  const selectedTargetOptions = documentTargetOptionsFor(selectedTargetKind);

  const favoriteDocuments = favoriteDocumentIds
    .map((id: string) =>
      visibleDocuments.find((document) => document.id === id),
    )
    .filter(Boolean) as DocumentRecord[];

  const recentDocuments = recentDocumentIds
    .filter((id: string) => !favoriteDocumentIds.includes(id))
    .map((id: string) =>
      visibleDocuments.find((document) => document.id === id),
    )
    .filter(Boolean)
    .slice(0, 8) as DocumentRecord[];

  const blueprintDocument = (allDocuments as DocumentRecord[]).find((document) => {
    const text = [
      document.title,
      document.type,
      document.area,
      document.notes,
      ...(document.files || []).map((file) => file.name),
    ]
      .join(" ")
      .toLowerCase();

    return (
      text.includes("as-built") ||
      text.includes("as built") ||
      text.includes("record set") ||
      (text.includes("2000") && text.includes("construction"))
    );
  });

  const linkedWorkOrders = selectedDocument
    ? serviceRecords.filter((record: any) => {
        return (
          record.documentId === selectedDocument.id ||
          (Array.isArray(record.documentIds) &&
            record.documentIds.includes(selectedDocument.id))
        );
      })
    : [];

  function openDocument(document: DocumentRecord) {
    setSelectedDocumentId(document.id);
    setSelectedDocumentFileIndex(0);
    setRecentDocumentIds((current: string[]) => [
      document.id,
      ...current.filter((id) => id !== document.id),
    ].slice(0, 8));
    setEditOpen(false);
    setMobileMoreOpen(false);
  }

  function toggleFavorite(id: string) {
    setFavoriteDocumentIds((current: string[]) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [id, ...current],
    );
  }

  function retarget(kind: IntakeTargetKind) {
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

  function retargetRecord(id: string) {
    if (!selectedDocument) return;
    const nextName = targetNameFor(selectedTargetKind, id);
    updateSelectedDocument(selectedDocument.id, {
      targetId: id,
      targetName: nextName,
      area: nextName,
      linkedAssetId:
        selectedTargetKind === "Asset" ? id : undefined,
      linkedVendorId:
        selectedTargetKind === "Vendor" ? id : undefined,
    });
  }

  function createDocument() {
    setIntakeTitle("");
    setIntakeType("Document");
    setIntakeTargetKind("General");
    setIntakeNotes("");
    setScreen("intake");
  }

  function openBlueprint() {
    if (!blueprintDocument) {
      setIntakeTitle("2000 As-Built Plans");
      setIntakeType("Property Plans");
      setIntakeTargetKind("General");
      setIntakeNotes(
        "Master construction record set / as-built drawings.",
      );
      setScreen("intake");
      return;
    }
    openDocument(blueprintDocument);
  }

  const panelStyle: React.CSSProperties = {
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    background: "#FFFFFF",
    padding: isMobile ? 11 : 14,
    minWidth: 0,
  };

  const compactButton: React.CSSProperties = {
    ...secondaryButtonStyle,
    minHeight: 34,
    padding: "6px 9px",
    fontSize: 11,
  };

  const relationshipChip = (
    label: string,
    value: string,
    onClick?: () => void,
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        border: `1px solid ${colors.line}`,
        borderRadius: 9,
        background: "#FFFFFF",
        padding: "7px 8px",
        textAlign: "left",
        minWidth: 0,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ ...mutedSmallStyle, display: "block" }}>{label}</span>
      <strong
        style={{
          color: colors.navy,
          fontSize: 12,
          display: "block",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value || "None"}
      </strong>
    </button>
  );

  if (selectedDocument) {
    return (
      <div style={{ display: "grid", gap: 11, minWidth: 0 }}>
        <section
          style={{
            ...panelStyle,
            position: isMobile ? "sticky" : "static",
            top: isMobile ? 0 : undefined,
            zIndex: isMobile ? 10 : undefined,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={eyebrowStyle}>Document</div>
              <h2
                style={{
                  ...editorHeaderStyle,
                  margin: "3px 0 0",
                  overflowWrap: "anywhere",
                }}
              >
                {selectedDocument.title || "Untitled Document"}
              </h2>
              <div style={{ ...mutedSmallStyle, marginTop: 4 }}>
                {selectedDocument.type || "Uncategorized"}
                {selectedDocument.createdAt
                  ? ` · ${formatDate(String(selectedDocument.createdAt).slice(0, 10))}`
                  : ""}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(3,minmax(0,1fr))"
                  : "auto auto auto",
                gap: 7,
                width: isMobile ? "100%" : "auto",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedDocumentId("")}
                style={{ ...compactButton, minHeight: 40 }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setEditOpen((current) => !current)}
                style={{ ...compactButton, minHeight: 40 }}
              >
                {editOpen ? "Done" : "Edit"}
              </button>
              <button
                type="button"
                onClick={() => void saveSelectedDocument()}
                style={{ ...goldButtonStyle, minHeight: 40 }}
              >
                Save
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2,minmax(0,1fr))"
                : "repeat(4,minmax(0,1fr))",
              gap: 6,
              marginTop: 10,
            }}
          >
            {relationshipChip(
              "Linked To",
              selectedDocument.targetName ||
                selectedDocument.area ||
                selectedDocument.targetType ||
                "General",
              selectedDocument.targetId
                ? () => openDocumentTarget(selectedDocument)
                : undefined,
            )}
            {relationshipChip(
              "Files",
              String(selectedFiles.length),
            )}
            {relationshipChip(
              "Work Orders",
              String(linkedWorkOrders.length),
            )}
            {relationshipChip(
              "Property",
              String(props.activePropertyId || "2000"),
            )}
          </div>

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileMoreOpen((current) => !current)}
              style={{ ...compactButton, width: "100%", marginTop: 8 }}
            >
              {mobileMoreOpen ? "Hide More Details" : "More Details"}
            </button>
          ) : null}
        </section>

        {selectedSource ? (
          <section style={{ ...panelStyle, padding: 8 }}>
            {selectedIsImage ? (
              <img
                src={selectedSource}
                alt={selectedDocument.title}
                style={{
                  width: "100%",
                  maxHeight: isMobile ? "64vh" : 560,
                  objectFit: "contain",
                  borderRadius: 10,
                  background: "#F8FAFC",
                }}
              />
            ) : selectedIsPdf ? (
              <div
                style={{
                  minHeight: isMobile ? 220 : 340,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  gap: 8,
                }}
              >
                <div>
                  <strong style={{ color: colors.navy }}>
                    PDF Document
                  </strong>
                  <div style={{ ...mutedSmallStyle, marginTop: 4 }}>
                    Open the file for full PDF navigation.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    selectedFile
                      ? openUploadedFile(selectedFile)
                      : openFileInBrowser(selectedDocument.href)
                  }
                  style={goldButtonStyle}
                >
                  Open PDF
                </button>
              </div>
            ) : (
              <div style={noticeStyle}>
                This file type is available to open directly.
              </div>
            )}
          </section>
        ) : selectedDocument.pastedText ? (
          <section style={panelStyle}>
            <div style={eyebrowStyle}>Document Text</div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                marginTop: 8,
              }}
            >
              {selectedDocument.pastedText}
            </div>
          </section>
        ) : (
          <section style={noticeStyle}>
            This record does not currently have a file, URL, or saved text.
          </section>
        )}

        {selectedFiles.length > 1 ? (
          <section style={panelStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
              }}
            >
              <strong style={{ color: colors.navy }}>Files</strong>
              <span style={mutedSmallStyle}>
                {safeFileIndex + 1} of {selectedFiles.length}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2,minmax(0,1fr))",
                gap: 7,
                marginTop: 8,
              }}
            >
              {selectedFiles.map((file, index) => (
                <button
                  key={file.id || `${file.name}-${index}`}
                  type="button"
                  onClick={() => setSelectedDocumentFileIndex(index)}
                  style={{
                    ...fileTileStyle,
                    borderColor:
                      index === safeFileIndex ? colors.gold : colors.line,
                    background:
                      index === safeFileIndex ? "#FFF9EA" : "#FFFFFF",
                    textAlign: "left",
                  }}
                >
                  <strong style={{ display: "block" }}>
                    {file.name || `File ${index + 1}`}
                  </strong>
                  <span style={mutedSmallStyle}>
                    {file.type || "File"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {editOpen || !isMobile || mobileMoreOpen ? (
          <section style={panelStyle}>
            <div style={eyebrowStyle}>Record Details</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2,minmax(0,1fr))",
                gap: 8,
                marginTop: 8,
              }}
            >
              <label style={{ display: "grid", gap: 4 }}>
                <span style={fieldLabelStyle}>TITLE</span>
                <input
                  value={selectedDocument.title || ""}
                  disabled={!editOpen}
                  onChange={(event) =>
                    updateSelectedDocument(selectedDocument.id, {
                      title: event.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={fieldLabelStyle}>CATEGORY</span>
                <input
                  value={selectedDocument.type || ""}
                  disabled={!editOpen}
                  onChange={(event) =>
                    updateSelectedDocument(selectedDocument.id, {
                      type: event.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={fieldLabelStyle}>LINK TYPE</span>
                <select
                  value={selectedTargetKind}
                  disabled={!editOpen}
                  onChange={(event) =>
                    retarget(event.target.value as IntakeTargetKind)
                  }
                  style={inputStyle}
                >
                  {["General", "Asset", "Location", "Vendor", "Work Order"].map(
                    (kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={fieldLabelStyle}>LINKED RECORD</span>
                <select
                  value={selectedDocument.targetId || ""}
                  disabled={!editOpen || selectedTargetKind === "General"}
                  onChange={(event) => retargetRecord(event.target.value)}
                  style={inputStyle}
                >
                  <option value="">None</option>
                  {selectedTargetOptions.map((option: any) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ display: "grid", gap: 4, marginTop: 8 }}>
              <span style={fieldLabelStyle}>NOTES</span>
              <textarea
                value={selectedDocument.notes || ""}
                disabled={!editOpen}
                onChange={(event) =>
                  updateSelectedDocument(selectedDocument.id, {
                    notes: event.target.value,
                  })
                }
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>

            {editOpen ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                {selectedFile ? (
                  <button
                    type="button"
                    onClick={() =>
                      replaceSelectedDocumentFile(
                        selectedDocument,
                        selectedFile,
                      )
                    }
                    style={compactButton}
                  >
                    Replace File
                  </button>
                ) : <span />}
                <button
                  type="button"
                  onClick={() => void deleteSelectedDocument()}
                  style={{
                    ...compactButton,
                    color: colors.red,
                    borderColor: "#F4B9B5",
                  }}
                >
                  Delete Document
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <section
        style={{
          ...panelStyle,
          background:
            "linear-gradient(135deg,#FFFFFF 0%,#F5F8FB 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={eyebrowStyle}>Knowledge</div>
            <h2 style={{ margin: "3px 0 0", color: colors.navy }}>
              Documents
            </h2>
            <div style={{ ...mutedSmallStyle, marginTop: 4 }}>
              Find plans, records, manuals, service files, photos and property documents.
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "auto auto",
              gap: 7,
              width: isMobile ? "100%" : "auto",
            }}
          >
            <button
              type="button"
              onClick={openBlueprint}
              style={{ ...compactButton, minHeight: 40 }}
            >
              As-Builts
            </button>
            <button
              type="button"
              onClick={createDocument}
              style={{ ...goldButtonStyle, minHeight: 40 }}
            >
              + Document
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2,minmax(0,1fr))"
              : "repeat(4,minmax(0,1fr))",
            gap: 7,
            marginTop: 11,
          }}
        >
          {[
            ["Documents", visibleDocuments.length],
            [
              "Files",
              visibleDocuments.reduce(
                (sum, document) => sum + (document.files?.length || 0),
                0,
              ),
            ],
            [
              "Linked",
              visibleDocuments.filter(
                (document) =>
                  document.targetId ||
                  document.targetName ||
                  (document.targetType &&
                    document.targetType !== "General"),
              ).length,
            ],
            ["Categories", categories.length],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 10,
                background: "#FFFFFF",
                padding: 9,
              }}
            >
              <span style={{ ...mutedSmallStyle, display: "block" }}>
                {label}
              </span>
              <strong
                style={{
                  display: "block",
                  marginTop: 2,
                  color: colors.navy,
                  fontSize: 18,
                }}
              >
                {value}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <input
          value={documentSearch}
          onChange={(event) => setDocumentSearch(event.target.value)}
          placeholder="Search documents, files, assets, vendors, locations..."
          style={{
            ...inputStyle,
            width: "100%",
            minHeight: 42,
            fontSize: 14,
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(3,minmax(0,1fr)) auto",
            gap: 7,
            marginTop: 8,
          }}
        >
          <select
            value={documentCategoryFilter}
            onChange={(event) =>
              setDocumentCategoryFilter(event.target.value)
            }
            style={inputStyle}
          >
            <option value="All">All categories</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <select
            value={documentLinkFilter}
            onChange={(event) =>
              setDocumentLinkFilter(event.target.value)
            }
            style={inputStyle}
          >
            <option value="All">All links</option>
            {linkTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>

          <select
            value={documentSort}
            onChange={(event) => setDocumentSort(event.target.value)}
            style={inputStyle}
          >
            <option value="recent">Newest</option>
            <option value="title">A–Z</option>
            <option value="category">Category</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setDocumentSearch("");
              setDocumentCategoryFilter("All");
              setDocumentLinkFilter("All");
              setDocumentSort("recent");
            }}
            style={compactButton}
          >
            Clear
          </button>
        </div>
      </section>

      {(favoriteDocuments.length || recentDocuments.length) ? (
        <section style={panelStyle}>
          <div style={eyebrowStyle}>Quick Access</div>
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              marginTop: 8,
              paddingBottom: 2,
            }}
          >
            {[...favoriteDocuments, ...recentDocuments]
              .slice(0, 10)
              .map((document) => (
                <button
                  key={`quick-${document.id}`}
                  type="button"
                  onClick={() => openDocument(document)}
                  style={{
                    ...compactButton,
                    flex: "0 0 auto",
                    maxWidth: 230,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {document.title}
                </button>
              ))}
          </div>
        </section>
      ) : null}

      <section style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid" }}>
          {visibleDocuments.map((document) => {
            const isFavorite = favoriteDocumentIds.includes(document.id);
            const fileCount = document.files?.length || 0;
            const context =
              document.targetName ||
              document.area ||
              (document.targetType &&
              document.targetType !== "General"
                ? document.targetType
                : "General");

            return (
              <div
                key={document.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  alignItems: "center",
                  padding: isMobile ? "10px 11px" : "11px 13px",
                  borderBottom: `1px solid ${colors.line}`,
                  minWidth: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => openDocument(document)}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    textAlign: "left",
                    minWidth: 0,
                    cursor: "pointer",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: colors.navy,
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {document.title || "Untitled Document"}
                  </strong>
                  <div
                    style={{
                      ...mutedSmallStyle,
                      marginTop: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {document.type || "Uncategorized"} · {context}
                    {fileCount ? ` · ${fileCount} file${fileCount === 1 ? "" : "s"}` : ""}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleFavorite(document.id)}
                  aria-label={
                    isFavorite ? "Remove favorite" : "Add favorite"
                  }
                  title={
                    isFavorite ? "Remove favorite" : "Add favorite"
                  }
                  style={{
                    ...smallSubtleButtonStyle,
                    minWidth: 34,
                    minHeight: 34,
                    fontSize: 16,
                  }}
                >
                  {isFavorite ? "★" : "☆"}
                </button>
              </div>
            );
          })}

          {!visibleDocuments.length ? (
            <div style={{ ...noticeStyle, margin: 12 }}>
              No documents match the current search and filters.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
