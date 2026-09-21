import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  FileArchive,
  Home,
  Images,
  Package,
  ScrollText,
  UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "./types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "exceptions";
  pmOnly?: boolean;
};

export const soldierNav: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/my-property", label: "My section", icon: Package },
  { href: "/sections", label: "ODA sections", icon: Users },
  { href: "/receipts/2062-in", label: "2062 in", icon: ScrollText },
  { href: "/receipts/2062-out", label: "2062 out", icon: UploadCloud },
  { href: "/exceptions", label: "Exceptions", icon: AlertTriangle, badgeKey: "exceptions" },
];

export const pmNav: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/my-property", label: "My property", icon: Package },
  { href: "/property", label: "ODA property", icon: Boxes, pmOnly: true },
  { href: "/sections", label: "Sections", icon: Users },
  { href: "/receipts", label: "Hand receipts", icon: ClipboardList, pmOnly: true },
  { href: "/loans", label: "DA Form 2062", icon: ScrollText, pmOnly: true },
  { href: "/exceptions", label: "Exceptions", icon: AlertTriangle, badgeKey: "exceptions" },
  { href: "/documents", label: "Documents", icon: FileArchive, pmOnly: true },
];

export function navForRole(role: AppRole): NavItem[] {
  return role === "pm" ? pmNav : soldierNav;
}

export function pageTitleForPath(pathname: string): string {
  const exact: Record<string, string> = {
    "/": "Home",
    "/my-property": "My section",
    "/property": "ODA property",
    "/sections": "ODA sections",
    "/receipts": "Hand receipts",
    "/loans": "DA Form 2062",
    "/receipts/2062-in": "DA Form 2062 in",
    "/receipts/2062-out": "DA Form 2062 out",
    "/exceptions": "Exceptions",
    "/documents": "Documents",
  };
  if (exact[pathname]) return exact[pathname];
  if (pathname.startsWith("/items/") || pathname.startsWith("/lines/")) return "Hand-receipt line";
  if (pathname.startsWith("/exceptions/")) return "Discrepancy";
  if (pathname.startsWith("/sections/")) return "Section Sub-hand receipt";
  if (pathname.startsWith("/receipts/2062-in/history")) return "2062 in history";
  if (pathname.startsWith("/receipts/2062-out/history")) return "2062 out history";
  if (pathname.startsWith("/receipts/history")) return "SHR inject history";
  return "ODA Property Workspace";
}

export const pictureBookNavHint = Images;
