import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Label Check | TTB prototype", description: "AI-assisted alcohol label verification" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
