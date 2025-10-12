"use client";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

export default function QRPage() {
  const { id } = useParams<{ id: string }>();
  const value = String(id || "");

  return (
    <main style={{ display:"grid", placeItems:"center", minHeight:"80vh" }}>
      <div style={{ textAlign:"center" }}>
        <h1 style={{ marginBottom: 16 }}>Event QR</h1>
        {/* QR encodes ONLY the event_id (simple & robust) */}
        <QRCodeCanvas value={value} size={300} includeMargin />
        <p style={{ marginTop: 12, opacity:.7 }}>{value}</p>
      </div>
    </main>
  );
}
