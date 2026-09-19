import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PainterApps — Weather. Specs. Jobs.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0f1724",
          color: "#f8f5ef",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#2dd4bf",
          }}
        >
          PainterApps
        </div>
        <div style={{ fontSize: 72, fontWeight: 650, marginTop: 16 }}>
          Weather. Specs. Jobs.
        </div>
        <div style={{ fontSize: 28, marginTop: 24, color: "#94a3b8" }}>
          Independent tools for professional painters.
        </div>
      </div>
    ),
    { ...size },
  );
}
