import { ImageResponse } from "next/og";

// Icône d'écran d'accueil iOS — même mark que icon.tsx, à la taille attendue
// par iOS (pas d'arrondi ici : le masque de coins est appliqué par iOS lui-même).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
          color: "white",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        D
      </div>
    ),
    { ...size }
  );
}
