"use client";

import React from "react";
import type { ManualRecord } from "../lib/atlas-types";

type Props = {
  Field: any;
  ListDrawerLayout: any;
  allManualRecords: any;
  assetRecords: any;
  blankManual: any;
  buttonRowStyle: any;
  byName: any;
  cardStyle: any;
  deleteManualRecord: any;
  fieldLabelStyle: any;
  fileToUploadedRecord: any;
  formGridStyle: any;
  goldButtonStyle: any;
  inputStyle: any;
  isMobile: any;
  locationName: any;
  manualActionRowStyle: any;
  manualAddOpen: any;
  manualCompactAssetStyle: any;
  manualCompactFileStyle: any;
  manualCompactListStyle: any;
  manualDeleteButtonStyle: any;
  manualDraft: any;
  manualInlineFormHeaderStyle: any;
  manualListHeaderStyle: any;
  manualMessage: any;
  manualNoPdfStyle: any;
  manualRecords: any;
  manualSearch: any;
  manualSimpleRowStyle: any;
  manualSimpleTableStyle: any;
  manualSimpleTitleStyle: any;
  mutedSmallStyle: any;
  normalizeDocument: any;
  normalizeManualRecord: any;
  openManualUrl: any;
  postDocumentToAtlasVault: any;
  replaceDocumentInVault: any;
  saveStoredArray: any;
  secondaryButtonStyle: any;
  setManualAddOpen: any;
  setManualDraft: any;
  setManualMessage: any;
  setManualRecords: any;
  setManualSearch: any;
  setScreen: any;
  setSelectedManualId: any;
  smallSubtleButtonStyle: any;
  stackStyle: any;
  storageKeys: any;
  uid: any;
};

export default function AtlasManuals({
  Field,
  ListDrawerLayout,
  allManualRecords,
  assetRecords,
  blankManual,
  buttonRowStyle,
  byName,
  cardStyle,
  deleteManualRecord,
  fieldLabelStyle,
  fileToUploadedRecord,
  formGridStyle,
  goldButtonStyle,
  inputStyle,
  isMobile,
  locationName,
  manualActionRowStyle,
  manualAddOpen,
  manualCompactAssetStyle,
  manualCompactFileStyle,
  manualCompactListStyle,
  manualDeleteButtonStyle,
  manualDraft,
  manualInlineFormHeaderStyle,
  manualListHeaderStyle,
  manualMessage,
  manualNoPdfStyle,
  manualRecords,
  manualSearch,
  manualSimpleRowStyle,
  manualSimpleTableStyle,
  manualSimpleTitleStyle,
  mutedSmallStyle,
  normalizeDocument,
  normalizeManualRecord,
  openManualUrl,
  postDocumentToAtlasVault,
  replaceDocumentInVault,
  saveStoredArray,
  secondaryButtonStyle,
  setManualAddOpen,
  setManualDraft,
  setManualMessage,
  setManualRecords,
  setManualSearch,
  setScreen,
  setSelectedManualId,
  smallSubtleButtonStyle,
  stackStyle,
  storageKeys,
  uid,
}: Props) {
    const normalizedSearch = manualSearch.trim().toLowerCase();

    const filteredManuals = [...allManualRecords]
      .filter((manual) => {
        if (!normalizedSearch) return true;
        return [
          manual.title,
          manual.linkedAssetName,
          manual.manufacturer,
          manual.model,
          manual.documentNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    function startNewManual() {
      setSelectedManualId("");
      setManualDraft(blankManual());
      setManualAddOpen(true);
      setManualMessage("");
    }

    function updateManualDraft(patch: Partial<ManualRecord>) {
      setManualDraft((current) =>
        normalizeManualRecord({ ...current, ...patch, id: "" }),
      );
    }

    async function saveManual() {
      const prepared = normalizeManualRecord({
        ...manualDraft,
        id: `manual-${Date.now()}`,
        linkedAssetName:
          assetRecords.find((asset) => asset.id === manualDraft.linkedAssetId)
            ?.name ||
          manualDraft.linkedAssetName ||
          "",
      });

      if (!prepared.title.trim()) {
        setManualMessage("Add a manual title before saving.");
        return;
      }

      const next = [prepared, ...manualRecords];
      setManualRecords(next);
      saveStoredArray(storageKeys.manuals[0], next);

      const linkedAsset = prepared.linkedAssetId
        ? assetRecords.find(
            (asset) => asset.id === prepared.linkedAssetId,
          )
        : undefined;
      const documentRecord = normalizeDocument({
        id: uid("doc"),
        title: prepared.title,
        area: linkedAsset
          ? locationName(linkedAsset.locationId)
          : prepared.linkedAssetName || "General",
        type: prepared.category,
        targetType: linkedAsset ? "Asset" : "General",
        targetId: linkedAsset?.id || "",
        targetName: linkedAsset?.name || "General",
        linkedAssetId: linkedAsset?.id,
        notes: [
          prepared.manufacturer
            ? `Manufacturer: ${prepared.manufacturer}`
            : "",
          prepared.model ? `Model: ${prepared.model}` : "",
          prepared.documentNumber
            ? `Document number: ${prepared.documentNumber}`
            : "",
          prepared.sourceLabel
            ? `Source: ${prepared.sourceLabel}`
            : "",
          prepared.notes,
        ]
          .filter(Boolean)
          .join("\n"),
        href: prepared.href,
        files: prepared.files,
        createdAt: prepared.createdAt,
      });

      replaceDocumentInVault(documentRecord);
      try {
        await postDocumentToAtlasVault(documentRecord);
        setManualMessage("Manual saved and synced to Atlas.");
      } catch {
        setManualMessage(
          "Manual saved on this browser. Atlas document sync did not complete.",
        );
      }

      setManualDraft(blankManual());
      setManualAddOpen(false);
    }

    async function addManualFiles(fileList: FileList | null) {
      if (!fileList?.length) return;
      const records = await Promise.all(
        Array.from(fileList).map(fileToUploadedRecord),
      );
      updateManualDraft({
        files: [...(manualDraft.files || []), ...records],
      });
    }

    return (
      <ListDrawerLayout
        eyebrow="Manual Library"
        title="Manuals"
        detail="Manuals listed alphabetically with their attached asset and a direct Open button."
        isMobile={isMobile}
        right={
          <>
            <button
              type="button"
              onClick={() => setScreen("documents")}
              style={secondaryButtonStyle}
            >
              Back to Documents
            </button>
            <button
              type="button"
              onClick={startNewManual}
              style={goldButtonStyle}
            >
              Add Manual
            </button>
          </>
        }
        list={
          <div style={stackStyle}>
            <div style={cardStyle}>
              <input
                value={manualSearch}
                onChange={(event) =>
                  setManualSearch(event.currentTarget.value)
                }
                placeholder="Search manuals or assets..."
                style={inputStyle}
              />
            </div>

            {manualAddOpen ? (
              <div style={cardStyle}>
                <div style={manualInlineFormHeaderStyle}>
                  <strong>Add Manual</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setManualAddOpen(false);
                      setManualDraft(blankManual());
                      setManualMessage("");
                    }}
                    style={smallSubtleButtonStyle}
                  >
                    Close
                  </button>
                </div>

                {manualMessage ? (
                  <p style={mutedSmallStyle}>{manualMessage}</p>
                ) : null}

                <div style={formGridStyle}>
                  <Field
                    label="Manual title"
                    value={manualDraft.title}
                    onChange={(title) => updateManualDraft({ title })}
                    placeholder="Official manual title"
                  />

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={fieldLabelStyle}>Attached asset</span>
                    <select
                      value={manualDraft.linkedAssetId || ""}
                      onChange={(event) => {
                        const asset = assetRecords.find(
                          (item) => item.id === event.currentTarget.value,
                        );
                        updateManualDraft({
                          linkedAssetId: event.currentTarget.value,
                          linkedAssetName: asset?.name || "",
                        });
                      }}
                      style={inputStyle}
                    >
                      <option value="">Not linked</option>
                      {byName(assetRecords).map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Field
                    label="PDF / manual link"
                    value={manualDraft.href}
                    onChange={(href) => updateManualDraft({ href })}
                    placeholder="Paste the online PDF URL"
                  />

                  <Field
                    label="Manufacturer"
                    value={manualDraft.manufacturer}
                    onChange={(manufacturer) =>
                      updateManualDraft({ manufacturer })
                    }
                  />

                  <Field
                    label="Model"
                    value={manualDraft.model}
                    onChange={(model) => updateManualDraft({ model })}
                  />

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={fieldLabelStyle}>Upload PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(event) =>
                        void addManualFiles(event.currentTarget.files)
                      }
                      style={inputStyle}
                    />
                  </label>
                </div>

                <div style={{ ...buttonRowStyle, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => void saveManual()}
                    style={goldButtonStyle}
                  >
                    Save Manual
                  </button>
                </div>
              </div>
            ) : null}

            <div style={manualSimpleTableStyle}>
              <div style={manualListHeaderStyle}>
                <span>Manual</span>
                <span>Asset</span>
                <span>Actions</span>
              </div>

              {filteredManuals.length ? (
                <div style={manualCompactListStyle}>
                  {filteredManuals.map((manual) => {
                    const manualOpenUrl = openManualUrl(manual);

                    return (
                      <div key={manual.id} style={manualSimpleRowStyle}>
                        <span style={manualSimpleTitleStyle}>
                          {manual.title}
                        </span>

                        <span style={manualCompactAssetStyle}>
                          {manual.linkedAssetName || "Not linked"}
                        </span>

                        <div style={manualActionRowStyle}>
                          {manualOpenUrl ? (
                            <a
                              href={manualOpenUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={manualCompactFileStyle}
                              aria-label={`Open ${manual.title}`}
                            >
                              Open
                            </a>
                          ) : (
                            <span style={manualNoPdfStyle}>—</span>
                          )}
                          <button
                            type="button"
                            onClick={() => void deleteManualRecord(manual)}
                            style={manualDeleteButtonStyle}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ ...mutedSmallStyle, padding: 16 }}>
                  No manuals match this search.
                </p>
              )}
            </div>
          </div>
        }
        drawer={undefined}
      />
    );
  
}
