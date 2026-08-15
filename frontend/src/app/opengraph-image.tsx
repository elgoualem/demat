import { ImageResponse } from "next/og";

export const alt = "DigiGo — Rechargez. Payez. Voyagez.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0b1630 0%, #172033 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#2563eb",
              color: "white",
              fontSize: 34,
              fontWeight: 700,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            D
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "white" }}>DigiGo</div>
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 40, fontWeight: 600, color: "#ffffff" }}>
          Rechargez. Payez. Voyagez.
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 26, color: "#10bfa5" }}>
          Recharges · Argent & paiements · Cartes prépayées · Voyages · Assurances
        </div>
      </div>
    ),
    { ...size }
  );
}
