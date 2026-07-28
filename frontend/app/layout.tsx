export const metadata = {
  title: "Intel-Threat-Modeller",
  description: "AI threat-modelling platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
