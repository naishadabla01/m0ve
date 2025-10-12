// move-dashboard/src/app/api/qr/route.ts
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs"; // ensure Node runtime for PNG generation

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text") || "";
    const size = Math.min(Math.max(Number(searchParams.get("size") || 512), 128), 2048);

    if (!text) {
      return NextResponse.json({ ok: false, error: "Missing ?text" }, { status: 400 });
    }

    const png = await QRCode.toBuffer(text, {
      errorCorrectionLevel: "M",
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    return new NextResponse(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
