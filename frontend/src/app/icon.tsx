import { ImageResponse } from "next/og";

// Icône d'onglet navigateur, même mark que le badge de app/opengraph-image.tsx
// et du composant Logo (pastille brand-600, "D") — remplace l'icône Next.js
// par défaut jusque-là utilisée (voir aussi favicon.ico, fallback statique
// pour les navigateurs qui ignorent cette route générée).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
          color: "white",
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        D
      </div>
    ),
    { ...size }
  );
}
