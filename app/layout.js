import "./globals.css";

export const metadata = {
  title: "UMMS Formulary Search",
  description: "UMMS formulary search with location filtering"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
