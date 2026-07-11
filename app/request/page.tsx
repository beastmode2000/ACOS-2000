"use client";

import React, { useEffect, useState } from "react";

type RequestPriority = "Low" | "Medium" | "High";

type UploadedPhoto = {
  id: string;
  name: string;
  type?: string;
  dataUrl?: string;
  createdAt?: string;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function tokenFromUrl() {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  const queryToken = url.searchParams.get("token") || "";
  if (queryToken) return queryToken;

  const parts = url.pathname.split("/").filter(Boolean);
  return parts[0] === "request" && parts[1]
    ? decodeURIComponent(parts[1])
    : "";
}

async function imageToDataUrl(file: File) {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const next = new Image();
    next.onload = () => resolve(next);
    next.onerror = () => reject(new Error("Photo could not be opened."));
    next.src = original;
  });

  const maxSide = 1000;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return original;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.68);
}

export default function OwnerRequestPage() {
  const [token, setToken] = useState("");
  const [portalReady, setPortalReady] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [requesterContact, setRequesterContact] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [assetName, setAssetName] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("Medium");
  const [preferredTiming, setPreferredTiming] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [message, setMessage] = useState("Checking request link...");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const nextToken = tokenFromUrl();
    setToken(nextToken);

    async function validate() {
      if (!nextToken) {
        setMessage("This request link is missing its secure token.");
        return;
      }

      try {
        const response = await fetch(
          `/api/atlas-requests?token=${encodeURIComponent(nextToken)}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || "Request link not found.");
        }
        setPortalReady(true);
        setMessage("Describe what needs attention. Atlas will send it for review.");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Request link not found.",
        );
      }
    }

    void validate();
  }, []);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setMessage("Preparing photos...");

    try {
      const remaining = Math.max(0, 3 - photos.length);
      const selected = Array.from(files).slice(0, remaining);
      const next: UploadedPhoto[] = [];

      for (const file of selected) {
        next.push({
          id: uid("request-photo"),
          name: file.name || "Request photo",
          type: "image/jpeg",
          dataUrl: await imageToDataUrl(file),
          createdAt: new Date().toISOString(),
        });
      }

      setPhotos((current) => [...current, ...next].slice(0, 3));
      setMessage("Photos ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Photos failed.");
    }
  }

  async function submitRequest() {
    if (!requesterName.trim() || !description.trim()) {
      setMessage("Please enter your name and describe the request.");
      return;
    }

    setSubmitting(true);
    setMessage("Submitting request...");

    try {
      const response = await fetch(
        `/api/atlas-requests?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requesterName,
            requesterContact,
            title,
            description,
            locationName,
            assetName,
            priority,
            preferredTiming,
            photos,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Request submission failed.");
      }

      setSubmitted(true);
      setMessage("Request submitted. Thank you.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Request submission failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="request-page">
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; background: #f4f7fb; }
        .request-page { min-height: 100dvh; padding: 16px; color: #172331; font-family: Arial, Helvetica, sans-serif; }
        .request-shell { width: min(100%, 760px); margin: 0 auto; display: grid; gap: 14px; }
        .request-hero { padding: 22px; border-radius: 22px; color: white; background: linear-gradient(135deg, #071b2f, #123d63); }
        .request-eyebrow { color: #e5c06b; font-size: 12px; font-weight: 900; letter-spacing: 1.2px; text-transform: uppercase; }
        h1 { margin: 7px 0 8px; font-size: clamp(30px, 7vw, 42px); }
        .request-hero p { margin: 0; color: rgba(255,255,255,.8); line-height: 1.5; }
        .request-card { padding: 20px; border: 1px solid #dde7f0; border-radius: 20px; background: white; box-shadow: 0 12px 30px rgba(7,27,47,.07); }
        .request-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
        label { display: grid; gap: 7px; color: #64748b; font-size: 12px; font-weight: 900; }
        input, select, textarea { width: 100%; min-width: 0; border: 1px solid #dde7f0; border-radius: 13px; padding: 12px; color: #172331; background: white; font: inherit; font-size: 16px; }
        textarea { min-height: 120px; resize: vertical; }
        .wide { grid-column: 1 / -1; }
        .photo-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; margin-top: 10px; }
        .photo { position: relative; overflow: hidden; border: 1px solid #dde7f0; border-radius: 14px; background: #f8fafc; }
        .photo img { display: block; width: 100%; height: 150px; object-fit: cover; }
        .photo button { position: absolute; top: 7px; right: 7px; border: 0; border-radius: 999px; padding: 7px 9px; background: rgba(255,255,255,.94); font-weight: 900; }
        .message { margin: 12px 0; padding: 12px; border-radius: 13px; background: #fff8e6; color: #071b2f; font-weight: 800; line-height: 1.4; overflow-wrap: anywhere; }
        .submit { width: 100%; min-height: 54px; border: 0; border-radius: 14px; background: #c99a3d; color: #071b2f; font-size: 17px; font-weight: 900; }
        .submit:disabled { opacity: .6; }
        .success { padding: 22px; border-radius: 18px; background: #eaf7f1; color: #087443; font-weight: 900; line-height: 1.5; }
        @media (max-width: 620px) {
          .request-page { padding: 9px; }
          .request-hero, .request-card { padding: 16px; border-radius: 17px; }
          .request-grid { grid-template-columns: 1fr; }
          .wide { grid-column: auto; }
          .photo-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="request-shell">
        <section className="request-hero">
          <div className="request-eyebrow">Atlas / 2000</div>
          <h1>Request Maintenance</h1>
          <p>Submit an issue or request for review. This page does not provide access to the rest of Atlas.</p>
        </section>

        <section className="request-card">
          {submitted ? (
            <div className="success">Your request was submitted and is waiting for review.</div>
          ) : (
            <>
              <div className="message" role="status">{message}</div>
              <div className="request-grid">
                <label>
                  Your name
                  <input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} disabled={!portalReady} />
                </label>
                <label>
                  Phone or email (optional)
                  <input value={requesterContact} onChange={(event) => setRequesterContact(event.target.value)} disabled={!portalReady} />
                </label>
                <label className="wide">
                  Short title (optional)
                  <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Guest room thermostat" disabled={!portalReady} />
                </label>
                <label>
                  Location
                  <input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="Example: Kitchen" disabled={!portalReady} />
                </label>
                <label>
                  Asset or equipment (optional)
                  <input value={assetName} onChange={(event) => setAssetName(event.target.value)} placeholder="Example: Left refrigerator" disabled={!portalReady} />
                </label>
                <label>
                  Priority
                  <select value={priority} onChange={(event) => setPriority(event.target.value as RequestPriority)} disabled={!portalReady}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
                <label>
                  Preferred timing (optional)
                  <input value={preferredTiming} onChange={(event) => setPreferredTiming(event.target.value)} placeholder="Example: Before Friday" disabled={!portalReady} />
                </label>
                <label className="wide">
                  What needs attention?
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!portalReady} />
                </label>
                <label className="wide">
                  Add photos (up to 3)
                  <input type="file" accept="image/*" capture="environment" multiple onChange={(event) => void addPhotos(event.currentTarget.files)} disabled={!portalReady || photos.length >= 3} />
                </label>
              </div>

              {photos.length ? (
                <div className="photo-grid">
                  {photos.map((photo) => (
                    <div className="photo" key={photo.id}>
                      <img src={photo.dataUrl} alt={photo.name} />
                      <button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}>Remove</button>
                    </div>
                  ))}
                </div>
              ) : null}

              <button className="submit" type="button" onClick={submitRequest} disabled={!portalReady || submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

