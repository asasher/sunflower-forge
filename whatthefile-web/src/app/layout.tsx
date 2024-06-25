import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";

export const metadata = {
  title: "What The File",
  description: "Simple utility to create an index of files in a directory",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <main className="flex min-h-screen w-screen flex-col items-center justify-start">
          {children}
        </main>
      </body>
    </html>
  );
}
