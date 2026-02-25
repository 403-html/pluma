import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 2rem",
          gap: "1.5rem",
          textAlign: "center",
        }}
      >
        <h1>{siteConfig.title}</h1>
        <p style={{ maxWidth: "480px", fontSize: "1.1rem" }}>
          {siteConfig.tagline}
        </p>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/sdk"
          >
            SDK Reference
          </Link>
        </div>
      </main>
    </Layout>
  );
}
