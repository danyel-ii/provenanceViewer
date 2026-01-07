import CubixlesLogo from "../_components/CubixlesLogo";
import HelpdeskClient from "./HelpdeskClient";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH && process.env.NEXT_PUBLIC_BASE_PATH !== "/"
    ? process.env.NEXT_PUBLIC_BASE_PATH.replace(/\/$/, "")
    : "";

export const metadata = {
  title: "cubixles_ helpdesk",
  description: "Provenance as trace. Ask anything.",
  metadataBase: new URL(`${baseUrl}${basePath}`),
};

export default function HelpPage() {
  return (
    <main className="landing-page landing-home landing-help">
      <section className="landing-header helpdesk-header">
        <div className="landing-intro">
          <h1 className="landing-title helpdesk-title">
            <CubixlesLogo />
            <span className="helpdesk-title-suffix">helpdesk</span>
          </h1>
          <p className="landing-subhead">Provenance as trace. Ask anything.</p>
        </div>
      </section>

      <HelpdeskClient />
    </main>
  );
}
