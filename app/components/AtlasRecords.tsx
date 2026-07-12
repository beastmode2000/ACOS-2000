"use client";
import React from "react";
type AtlasRecordsProps = {
    mode: "locations" | "assets" | "vendors";
    ctx: Record<string, any>;
};
export default function AtlasRecords({ mode, ctx }: AtlasRecordsProps) {
    const { Field, ListDrawerLayout, SelectField, addAsset, addAssetPhotoFiles, addLinkedPhotoFiles, addVendor, addWorkOrder, assetHeaderMetaStyle, assetHeaderNameRowStyle, assetHeaderNameStyle, assetHeaderTextStyle, assetPhotoActionButtonStyle, assetPhotoButtonRowStyle, assetPhotoLargeImageStyle, assetPhotoLargeStyle, assetPhotoUploadButtonStyle, assetRecords, assetVisualHeaderStyle, badgeStyle, buttonRowStyle, byName, colors, compactLinkedListStyle, compactLinkedRowStyle, compactPhotoButtonStyle, compactUploadButtonStyle, coverPhotoLabelStyle, dangerButtonStyle, deleteAssetPhoto, deleteAssetRecord, deleteLinkedImage, deleteManualRecord, deleteVendorRecord, detailSectionHeaderStyle, detailSectionStyle, editorHeaderStyle, eyebrowStyle, fieldLabelStyle, filesFromClipboardPayload, filteredAssets, filteredLocations, filteredVendors, findManualForAsset, formGridStyle, formatDate, goldButtonStyle, imageFilesFromPasteEvent, imagePayloadFromPasteEvent, inputStyle, isMobile, isRecordDirty, linkedImageFilesFor, listStyle, locationName, locations, manualActionRowStyle, manualAssetRowStyle, manualCompactFileStyle, manualDeleteButtonStyle, manualNoPdfStyle, manualsForAsset, mutedSmallStyle, normalizeVendor, noticeStyle, openManualUrl, openPhotoPreview, openUploadedFile, pasteAssetPhoto, pasteLinkedPhoto, photoDeleteButtonStyle, photoGridStyle, photoManageCardStyle, photoMissingStyle, photoSource, photoStyle, photos, recordInfoGridStyle, recordInfoItemStyle, recordListIdentityStyle, recordListThumbImageStyle, recordListThumbStyle, recordNotesStyle, renderLinkedDocuments, rowButtonStyle, saveDirtyRecord, secondaryButtonStyle, selectedAsset, selectedAssetId, selectedAssetPhotos, selectedLocation, selectedVendor, serviceRecords, setDatabaseStatus, setScreen, setSelectedAssetId, setSelectedLocationId, setSelectedServiceId, setSelectedVendorId, setVendorRecords, stackStyle, startManualForAsset, updateAsset, updateVendor, vendorDetailHeaderStyle, vendorLogoFor, vendorLogoImageStyle, vendorLogoLargeStyle, vendorLogoThumbStyle, } = ctx;
    function renderLocations() {
        const locationPhotos = selectedLocation.id
            ? linkedImageFilesFor("Location", selectedLocation.id)
            : [];
        const locationAssets = selectedLocation.id
            ? byName(assetRecords.filter((asset: any) => asset.locationId === selectedLocation.id))
            : [];
        return (<ListDrawerLayout eyebrow="Property Areas" title="Locations" isMobile={isMobile} list={<div style={listStyle}>
              {filteredLocations.map((location: any) => (<button key={location.id} type="button" onClick={() => setSelectedLocationId(location.id)} style={{
                        ...rowButtonStyle,
                        borderColor: location.id === selectedLocation.id
                            ? colors.gold
                            : colors.line,
                    }}>
                  <div>
                    <strong>{location.name}</strong>
                    <p style={mutedSmallStyle}>
                      {location.type} · {location.zone}
                    </p>
                  </div>
                  <span style={badgeStyle("Monitor")}>
                    {assetRecords.filter((asset: any) => asset.locationId === location.id).length}{" "}
                    assets
                  </span>
                </button>))}
            </div>} drawer={selectedLocation.id ? (<div style={stackStyle} tabIndex={0} onPaste={(event: any) => {
                    const files = imageFilesFromPasteEvent(event);
                    if (!files.length)
                        return;
                    event.preventDefault();
                    void addLinkedPhotoFiles("Location", selectedLocation.id, selectedLocation.name, files);
                }}>
                <div>
                  <h3 style={editorHeaderStyle}>{selectedLocation.name}</h3>
                  <div style={recordInfoGridStyle}>
                    <div style={recordInfoItemStyle}>
                      <span style={fieldLabelStyle}>Type</span>
                      <strong>{selectedLocation.type || "—"}</strong>
                    </div>
                    <div style={recordInfoItemStyle}>
                      <span style={fieldLabelStyle}>Zone</span>
                      <strong>{selectedLocation.zone || "—"}</strong>
                    </div>
                  </div>
                  {selectedLocation.notes ? (<p style={recordNotesStyle}>{selectedLocation.notes}</p>) : null}
                </div>
  
                <section style={detailSectionStyle}>
                  <div style={detailSectionHeaderStyle}>
                    <div>
                      <div style={eyebrowStyle}>Photos</div>
                      <strong>{locationPhotos.length} attached</strong>
                    </div>
                    <div style={buttonRowStyle}>
                      <button type="button" onClick={() => void pasteLinkedPhoto("Location", selectedLocation.id, selectedLocation.name)} style={secondaryButtonStyle}>
                        Paste Image
                      </button>
                      <label style={compactUploadButtonStyle}>
                        Add Photo
                        <input type="file" accept="image/*" multiple capture="environment" onChange={(event: any) => {
                    void addLinkedPhotoFiles("Location", selectedLocation.id, selectedLocation.name, event.currentTarget.files);
                    event.currentTarget.value = "";
                }} style={{ display: "none" }}/>
                      </label>
                    </div>
                  </div>
  
                  {locationPhotos.length ? (<div style={photoGridStyle}>
                      {locationPhotos.map((file: any) => (<div key={file.id} style={photoManageCardStyle}>
                          <button type="button" onClick={() => openUploadedFile(file)} style={compactPhotoButtonStyle}>
                            <img src={file.dataUrl || file.url} alt={file.name} style={photoStyle}/>
                            <strong>{file.name}</strong>
                          </button>
                          <button type="button" onClick={() => void deleteLinkedImage(file)} style={photoDeleteButtonStyle}>
                            Delete
                          </button>
                        </div>))}
                    </div>) : (<p style={mutedSmallStyle}>
                      No photos attached yet. You can also click this panel and paste a copied image.
                    </p>)}
                </section>
  
                <section style={detailSectionStyle}>
                  <div style={eyebrowStyle}>Assets at this location</div>
                  {locationAssets.length ? (<div style={compactLinkedListStyle}>
                      {locationAssets.map((asset: any) => (<button key={asset.id} type="button" onClick={() => {
                            setSelectedAssetId(asset.id);
                            setScreen("assets");
                        }} style={compactLinkedRowStyle}>
                          <span>
                            <strong>{asset.name}</strong>
                            <small style={mutedSmallStyle}>
                              {asset.category}
                            </small>
                          </span>
                          <span style={badgeStyle(asset.status)}>
                            {asset.status}
                          </span>
                        </button>))}
                    </div>) : (<p style={mutedSmallStyle}>
                      No assets are assigned to this location.
                    </p>)}
                </section>
  
                {renderLinkedDocuments("Location", selectedLocation.id)}
              </div>) : (<div style={noticeStyle}>
                <strong>Select a location.</strong>
                <p style={mutedSmallStyle}>
                  Open a location to see its information, photos, and assets.
                </p>
              </div>)}/>);
    }
    function renderAssets() {
        const attachedManuals = manualsForAsset(selectedAsset);
        const relatedWorkOrders = selectedAsset.id
            ? [...serviceRecords]
                .filter((record: any) => record.assetId === selectedAsset.id)
                .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
            : [];
        const selectedAssetCoverPhoto = selectedAssetPhotos[0];
        const selectedAssetCoverSource = photoSource(selectedAssetCoverPhoto);
        return (<ListDrawerLayout eyebrow="Property Records" title="Assets" isMobile={isMobile} drawerResetKey={selectedAssetId} right={<button type="button" onClick={addAsset} style={goldButtonStyle}>
              Add Asset
            </button>} list={<div style={listStyle}>
              {filteredAssets.map((asset: any) => {
                    const coverPhoto = photos.find((photo: any) => photo.assetId === asset.id);
                    const coverPhotoSource = photoSource(coverPhoto);
                    return (<button key={asset.id} type="button" onClick={() => setSelectedAssetId(asset.id)} style={{
                            ...rowButtonStyle,
                            borderColor: asset.id === selectedAsset.id
                                ? colors.gold
                                : colors.line,
                        }}>
                    <div style={recordListIdentityStyle}>
                      <div style={recordListThumbStyle}>
                        {coverPhotoSource ? (<img src={coverPhotoSource} alt="" style={recordListThumbImageStyle}/>) : (<span>{asset.name.slice(0, 1).toUpperCase()}</span>)}
                      </div>
                      <div>
                        <strong>{asset.name}</strong>
                        <p style={mutedSmallStyle}>
                          {asset.category} · {locationName(asset.locationId)}
                        </p>
                        <p style={mutedSmallStyle}>
                          {[asset.make, asset.model, asset.serial]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <span style={badgeStyle(asset.status)}>{asset.status}</span>
                  </button>);
                })}
            </div>} drawer={selectedAsset.id ? (<div style={stackStyle} tabIndex={0} onPaste={(event: any) => {
                    const payload = imagePayloadFromPasteEvent(event);
                    if (!payload.files.length && !payload.urls.length)
                        return;
                    event.preventDefault();
                    void (async () => {
                        try {
                            setDatabaseStatus("Reading pasted image...");
                            const files = await filesFromClipboardPayload(payload.files, payload.urls);
                            if (!files.length) {
                                throw new Error("No usable image was found. Use Copy image instead of Copy link.");
                            }
                            await addAssetPhotoFiles(files);
                        }
                        catch (error) {
                            setDatabaseStatus(error instanceof Error
                                ? error.message
                                : "Could not paste that image.");
                        }
                    })();
                }}>
                <div style={assetVisualHeaderStyle}>
                  <div style={assetPhotoLargeStyle}>
                    {selectedAssetCoverSource ? (<img src={selectedAssetCoverSource} alt={selectedAsset.name} style={assetPhotoLargeImageStyle}/>) : (<span>
                        {selectedAsset.name.slice(0, 1).toUpperCase()}
                      </span>)}
                  </div>
  
                  <div style={assetHeaderTextStyle}>
                    <div style={assetHeaderNameRowStyle}>
                      <h3 style={assetHeaderNameStyle}>
                        {selectedAsset.name.trim() || "Asset"}
                      </h3>
                      <span style={badgeStyle(selectedAsset.status)}>
                        {selectedAsset.status}
                      </span>
                    </div>
  
                    <p style={assetHeaderMetaStyle}>
                      {selectedAsset.category || "Uncategorized"} ·{" "}
                      {locationName(selectedAsset.locationId)}
                    </p>
  
                    <p style={assetHeaderMetaStyle}>
                      {[selectedAsset.make, selectedAsset.model, selectedAsset.serial]
                    .filter(Boolean)
                    .join(" · ")}
                    </p>
                  </div>
  
                  <div style={assetPhotoButtonRowStyle}>
                    <button type="button" onClick={() => void pasteAssetPhoto()} style={assetPhotoActionButtonStyle}>
                      Paste Image
                    </button>
  
                    <label style={assetPhotoUploadButtonStyle}>
                      {selectedAssetCoverPhoto ? "Add Another" : "Add Photo"}
                      <input type="file" accept="image/*" multiple capture="environment" onChange={(event: any) => {
                    void addAssetPhotoFiles(event.currentTarget.files);
                    event.currentTarget.value = "";
                }} style={{ display: "none" }}/>
                    </label>
                  </div>
                </div>
  
                <section style={detailSectionStyle}>
                  <div style={eyebrowStyle}>Asset Information</div>
                  <div style={formGridStyle}>
                    <Field label="Name" value={selectedAsset.name} onChange={(value: any) => updateAsset({ name: value })}/>
                    <Field label="Category" value={selectedAsset.category} onChange={(value: any) => updateAsset({ category: value })}/>
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Location</span>
                      <select value={selectedAsset.locationId} onChange={(event: any) => updateAsset({
                    locationId: event.currentTarget.value,
                })} style={inputStyle}>
                        <option value="">No location</option>
                        {locations.map((location: any) => (<option key={location.id} value={location.id}>
                            {location.name}
                          </option>))}
                      </select>
                    </label>
                    <SelectField label="Status" value={selectedAsset.status} onChange={(value: any) => updateAsset({ status: value })} options={["Online", "Offline", "Seasonal", "Monitor"] as const}/>
                    <Field label="Make" value={selectedAsset.make ?? ""} onChange={(value: any) => updateAsset({ make: value })}/>
                    <Field label="Model" value={selectedAsset.model ?? ""} onChange={(value: any) => updateAsset({ model: value })}/>
                    <Field label="Serial / VIN / HIN" value={selectedAsset.serial ?? ""} onChange={(value: any) => updateAsset({ serial: value })}/>
                    <Field label="Vendor IDs" value={selectedAsset.vendorIds.join(", ")} onChange={(value: any) => updateAsset({
                    vendorIds: value
                        .split(",")
                        .map((item: any) => item.trim())
                        .filter(Boolean),
                })}/>
                    <Field label="Notes" value={selectedAsset.notes} onChange={(value: any) => updateAsset({ notes: value })} multiline/>
                  </div>
  
                  <div style={buttonRowStyle}>
                    {isRecordDirty("asset", selectedAsset.id) ? (<button type="button" onClick={() => void saveDirtyRecord("assets", selectedAsset, "asset", selectedAsset.id)} style={goldButtonStyle}>
                        Save Asset
                      </button>) : null}
                    <button type="button" onClick={addWorkOrder} style={secondaryButtonStyle}>
                      Create Work Order
                    </button>
                    <button type="button" onClick={() => void deleteAssetRecord(selectedAsset)} style={dangerButtonStyle}>
                      Delete Asset
                    </button>
                  </div>
                </section>
  
                <section style={detailSectionStyle}>
                  <div style={detailSectionHeaderStyle}>
                    <div>
                      <div style={eyebrowStyle}>Manuals</div>
                      <strong>
                        {attachedManuals.length
                    ? `${attachedManuals.length} attached`
                    : "No manual attached"}
                      </strong>
                    </div>
                    <div style={buttonRowStyle}>
                      <button type="button" onClick={() => startManualForAsset(selectedAsset)} style={secondaryButtonStyle}>
                        Add Manual
                      </button>
                      <button type="button" onClick={() => findManualForAsset(selectedAsset)} style={goldButtonStyle}>
                        Find Online
                      </button>
                    </div>
                  </div>
  
                  {attachedManuals.length ? (<div style={compactLinkedListStyle}>
                      {attachedManuals.map((manual: any) => {
                        const url = openManualUrl(manual);
                        return (<div key={manual.id} style={manualAssetRowStyle}>
                            <span style={{ minWidth: 0 }}>
                              <strong>{manual.title}</strong>
                              <small style={mutedSmallStyle}>
                                {[manual.manufacturer, manual.model]
                                .filter(Boolean)
                                .join(" · ") || manual.category}
                              </small>
                            </span>
                            <div style={manualActionRowStyle}>
                              {url ? (<a href={url} target="_blank" rel="noopener noreferrer" style={manualCompactFileStyle}>
                                  Open
                                </a>) : (<span style={manualNoPdfStyle}>—</span>)}
                              <button type="button" onClick={() => void deleteManualRecord(manual)} style={manualDeleteButtonStyle}>
                                Delete
                              </button>
                            </div>
                          </div>);
                    })}
                    </div>) : (<p style={mutedSmallStyle}>
                      Use Find Online to search official manufacturer sources,
                      or Add Manual to paste a known link.
                    </p>)}
                </section>
  
                <section style={detailSectionStyle}>
                  <div style={detailSectionHeaderStyle}>
                    <div>
                      <div style={eyebrowStyle}>Photos</div>
                      <strong>{selectedAssetPhotos.length} attached</strong>
                    </div>
                    <div style={buttonRowStyle}>
                      <button type="button" onClick={() => void pasteAssetPhoto()} style={secondaryButtonStyle}>
                        Paste Image
                      </button>
                      <label style={compactUploadButtonStyle}>
                        Add Photo
                        <input type="file" accept="image/*" multiple capture="environment" onChange={(event: any) => {
                    void addAssetPhotoFiles(event.currentTarget.files);
                    event.currentTarget.value = "";
                }} style={{ display: "none" }}/>
                      </label>
                    </div>
                  </div>
  
                  {selectedAssetPhotos.length ? (<div style={photoGridStyle}>
                      {selectedAssetPhotos.map((photo: any, index: any) => {
                        const source = photoSource(photo);
                        return (<div key={photo.id} style={photoManageCardStyle}>
                            <button type="button" onClick={() => openPhotoPreview(photo)} style={compactPhotoButtonStyle} disabled={!source}>
                              {source ? (<img src={source} alt={photo.name} style={photoStyle}/>) : (<div style={photoMissingStyle}>
                                  Image data missing
                                </div>)}
                              <strong>{photo.name}</strong>
                              {index === 0 ? (<small style={coverPhotoLabelStyle}>
                                  Main photo
                                </small>) : null}
                            </button>
                            <button type="button" onClick={() => void deleteAssetPhoto(photo)} style={photoDeleteButtonStyle}>
                              Delete
                            </button>
                          </div>);
                    })}
                    </div>) : (<p style={mutedSmallStyle}>
                      No photos attached yet. You can also click this panel and paste a copied image.
                    </p>)}
                </section>
  
                <section style={detailSectionStyle}>
                  <div style={eyebrowStyle}>Work Order History</div>
                  {relatedWorkOrders.length ? (<div style={compactLinkedListStyle}>
                      {relatedWorkOrders.slice(0, 8).map((record: any) => (<button key={record.id} type="button" onClick={() => {
                            setSelectedServiceId(record.id);
                            setScreen("history");
                        }} style={compactLinkedRowStyle}>
                          <span>
                            <strong>{record.title}</strong>
                            <small style={mutedSmallStyle}>
                              {formatDate(record.date)}
                            </small>
                          </span>
                          <span style={badgeStyle(record.status)}>
                            {record.status}
                          </span>
                        </button>))}
                    </div>) : (<p style={mutedSmallStyle}>
                      No work orders are linked to this asset.
                    </p>)}
                </section>
  
                {renderLinkedDocuments("Asset", selectedAsset.id)}
              </div>) : (<div style={noticeStyle}>
                <strong>Select an asset.</strong>
                <p style={mutedSmallStyle}>
                  Open an asset to see its information, manuals, photos, work
                  orders, and documents.
                </p>
              </div>)}/>);
    }
    function renderVendors() {
        const selectedVendorLogo = selectedVendor.id
            ? vendorLogoFor(selectedVendor.id)
            : undefined;
        const selectedVendorPhotos = selectedVendor.id
            ? linkedImageFilesFor("Vendor", selectedVendor.id)
            : [];
        const relatedVendorAssets = selectedVendor.id
            ? byName(assetRecords.filter((asset: any) => asset.vendorIds.includes(selectedVendor.id)))
            : [];
        return (<ListDrawerLayout eyebrow="Property Records" title="Vendors" isMobile={isMobile} right={<button type="button" onClick={addVendor} style={goldButtonStyle}>
              Add Vendor
            </button>} list={<div style={listStyle}>
              {filteredVendors.map((vendor: any) => {
                    const logo = vendorLogoFor(vendor.id);
                    const logoSrc = logo?.dataUrl || logo?.url || "";
                    return (<button key={vendor.id} type="button" onClick={() => setSelectedVendorId(vendor.id)} style={{
                            ...rowButtonStyle,
                            borderColor: vendor.id === selectedVendor.id
                                ? colors.gold
                                : colors.line,
                        }}>
                    <div style={recordListIdentityStyle}>
                      <div style={vendorLogoThumbStyle}>
                        {logoSrc ? (<img src={logoSrc} alt={`${vendor.name} logo`} style={vendorLogoImageStyle}/>) : (<span>{vendor.name.slice(0, 2).toUpperCase()}</span>)}
                      </div>
                      <div>
                        <strong>{vendor.name}</strong>
                        <p style={mutedSmallStyle}>{vendor.category}</p>
                        <p style={mutedSmallStyle}>
                          {[vendor.phone, vendor.email]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                  </button>);
                })}
            </div>} drawer={selectedVendor.id ? (<div style={stackStyle} tabIndex={0} onPaste={(event: any) => {
                    const files = imageFilesFromPasteEvent(event);
                    if (!files.length)
                        return;
                    event.preventDefault();
                    void addLinkedPhotoFiles("Vendor", selectedVendor.id, selectedVendor.name, files, selectedVendorLogo ? "Photo" : "Vendor Logo");
                }}>
                <div style={vendorDetailHeaderStyle}>
                  <div style={vendorLogoLargeStyle}>
                    {selectedVendorLogo?.dataUrl ||
                    selectedVendorLogo?.url ? (<img src={selectedVendorLogo.dataUrl ||
                        selectedVendorLogo.url} alt={`${selectedVendor.name} logo`} style={vendorLogoImageStyle}/>) : (<span>
                        {selectedVendor.name.slice(0, 2).toUpperCase()}
                      </span>)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={editorHeaderStyle}>
                      {selectedVendor.name.trim() || "Vendor"}
                    </h3>
                    <p style={mutedSmallStyle}>
                      {selectedVendor.category || "Uncategorized"}
                    </p>
                  </div>
                  <div style={buttonRowStyle}>
                    <button type="button" onClick={() => void pasteLinkedPhoto("Vendor", selectedVendor.id, selectedVendor.name, "Vendor Logo")} style={secondaryButtonStyle}>
                      Paste Logo
                    </button>
                    <label style={compactUploadButtonStyle}>
                      {selectedVendorLogo ? "Change Logo" : "Add Logo"}
                      <input type="file" accept="image/*" onChange={(event: any) => {
                    void addLinkedPhotoFiles("Vendor", selectedVendor.id, selectedVendor.name, event.currentTarget.files, "Vendor Logo");
                    event.currentTarget.value = "";
                }} style={{ display: "none" }}/>
                    </label>
                    {selectedVendorLogo ? (<button type="button" onClick={() => void deleteLinkedImage(selectedVendorLogo)} style={dangerButtonStyle}>
                        Delete Logo
                      </button>) : null}
                  </div>
                </div>
  
                <section style={detailSectionStyle}>
                  <div style={eyebrowStyle}>Vendor Information</div>
                  <div style={formGridStyle}>
                    <Field label="Name" value={selectedVendor.name} onChange={(value: any) => setVendorRecords((current: any) => byName(current.map((item: any) => item.id === selectedVendor.id
                    ? normalizeVendor({
                        ...item,
                        name: value,
                    })
                    : item)))}/>
                    <Field label="Category" value={selectedVendor.category} onChange={(value: any) => setVendorRecords((current: any) => byName(current.map((item: any) => item.id === selectedVendor.id
                    ? normalizeVendor({
                        ...item,
                        category: value,
                    })
                    : item)))}/>
                    <Field label="Phone" value={selectedVendor.phone ?? ""} onChange={(value: any) => updateVendor({ phone: value })}/>
                    <Field label="Email" value={selectedVendor.email ?? ""} onChange={(value: any) => updateVendor({ email: value })}/>
                    <Field label="Website" value={selectedVendor.website ?? ""} onChange={(value: any) => updateVendor({ website: value })}/>
                    <Field label="Notes" value={selectedVendor.notes} onChange={(value: any) => updateVendor({ notes: value })} multiline/>
                  </div>
  
                  <div style={buttonRowStyle}>
                    {isRecordDirty("vendor", selectedVendor.id) ? (<button type="button" onClick={() => void saveDirtyRecord("vendors", selectedVendor, "vendor", selectedVendor.id)} style={goldButtonStyle}>
                        Save Vendor
                      </button>) : null}
                    <button type="button" onClick={() => void deleteVendorRecord(selectedVendor)} style={dangerButtonStyle}>
                      Delete Vendor
                    </button>
                  </div>
                </section>
  
                <section style={detailSectionStyle}>
                  <div style={detailSectionHeaderStyle}>
                    <div>
                      <div style={eyebrowStyle}>Photos</div>
                      <strong>{selectedVendorPhotos.length} attached</strong>
                    </div>
                    <div style={buttonRowStyle}>
                      <button type="button" onClick={() => void pasteLinkedPhoto("Vendor", selectedVendor.id, selectedVendor.name)} style={secondaryButtonStyle}>
                        Paste Image
                      </button>
                      <label style={compactUploadButtonStyle}>
                        Add Photo
                        <input type="file" accept="image/*" multiple capture="environment" onChange={(event: any) => {
                    void addLinkedPhotoFiles("Vendor", selectedVendor.id, selectedVendor.name, event.currentTarget.files);
                    event.currentTarget.value = "";
                }} style={{ display: "none" }}/>
                      </label>
                    </div>
                  </div>
  
                  {selectedVendorPhotos.length ? (<div style={photoGridStyle}>
                      {selectedVendorPhotos.map((file: any) => (<div key={file.id} style={photoManageCardStyle}>
                          <button type="button" onClick={() => openUploadedFile(file)} style={compactPhotoButtonStyle}>
                            <img src={file.dataUrl || file.url} alt={file.name} style={photoStyle}/>
                            <strong>{file.name}</strong>
                          </button>
                          <button type="button" onClick={() => void deleteLinkedImage(file)} style={photoDeleteButtonStyle}>
                            Delete
                          </button>
                        </div>))}
                    </div>) : (<p style={mutedSmallStyle}>
                      No vendor photos attached yet. You can also click this panel and paste a copied image.
                    </p>)}
                </section>
  
                <section style={detailSectionStyle}>
                  <div style={eyebrowStyle}>Related Assets</div>
                  {relatedVendorAssets.length ? (<div style={compactLinkedListStyle}>
                      {relatedVendorAssets.map((asset: any) => (<button key={asset.id} type="button" onClick={() => {
                            setSelectedAssetId(asset.id);
                            setScreen("assets");
                        }} style={compactLinkedRowStyle}>
                          <span>
                            <strong>{asset.name}</strong>
                            <small style={mutedSmallStyle}>
                              {asset.category}
                            </small>
                          </span>
                          <span style={badgeStyle(asset.status)}>
                            {asset.status}
                          </span>
                        </button>))}
                    </div>) : (<p style={mutedSmallStyle}>
                      No assets currently list this vendor.
                    </p>)}
                </section>
  
                {renderLinkedDocuments("Vendor", selectedVendor.id)}
              </div>) : (<div style={noticeStyle}>
                <strong>Select a vendor.</strong>
                <p style={mutedSmallStyle}>
                  Open a vendor to see contact information, logo, photos,
                  related assets, and documents.
                </p>
              </div>)}/>);
    }
    if (mode === "locations")
        return renderLocations();
    if (mode === "assets")
        return renderAssets();
    return renderVendors();
}

