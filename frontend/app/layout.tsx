import Link from "next/link";

export const metadata = {
  title: "Intel-Threat-Modeller",
  description: "AI threat-modelling platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", color: "#1a1a1a" }}>
        <header style={{ borderBottom: "1px solid #ddd", padding: "1rem 1.5rem" }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", textDecoration: "none", color: "inherit" }}>
            Intel-Threat-Modeller
          </Link>
        </header>
        <main style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>{children}</main>
      </body>
    </html>
  );
}
