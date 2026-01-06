import "./globals.css";
import FloatingDiamonds from "./_components/FloatingDiamonds";
import FrostOverlay from "./_components/FrostOverlay";

export const metadata = {
  title: "cubixles_ — Provenance as Composition",
  description:
    "Provenance here is not who owned what — it’s what made what possible.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FrostOverlay />
        <FloatingDiamonds />
        {children}
      </body>
    </html>
  );
}
