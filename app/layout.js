import "./globals.css";

export const metadata = {
  title: "Formulary Search",
  description: "Dynamic Airtable-backed formulary search"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
