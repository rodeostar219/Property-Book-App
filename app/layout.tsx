import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Property Ledger | W51HXC", description: "Hand receipt reconciliation and property accountability for SFODA-1223.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
