import "./global.css";

export const metadata = {
  title: "SaaS Starter",
  description: "A reusable starter template for building SaaS products.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
