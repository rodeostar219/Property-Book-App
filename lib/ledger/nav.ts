import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  FileArchive,
  Home,
  Package,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "./types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "exceptions";
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const home: NavItem = { href: "/", label: "Home", icon: Home };
const mySection: NavItem = { href: "/my-property", label: "My section", icon: Package };
const importItem: NavItem = {
  href: "/receipts/2062-in",
  label: "Import (SHR, 2062, BOM)",
  icon: ScrollText,
};
const exceptions: NavItem = {
  href: "/exceptions",
  label: "Exceptions",
  icon: AlertTriangle,
  badgeKey: "exceptions",
};

export const soldierNavGroups: NavGroup[] = [
  { id: "workspace", label: "Workspace", items: [home, mySection] },
  { id: "records", label: "Records", items: [importItem, exceptions] },
];

export const pmNavGroups: NavGroup[] = [
  { id: "workspace", label: "Workspace", items: [home, mySection] },
  {
    id: "book",
    label: "Book",
    items: [
      { href: "/property", label: "ODA property", icon: Boxes },
      { href: "/receipts", label: "Hand receipts", icon: ClipboardList },
      { href: "/documents", label: "Documents", icon: FileArchive },
    ],
  },
  { id: "records", label: "Records", items: [importItem, exceptions] },
];

export function navGroupsForRole(role: AppRole): NavGroup[] {
  return role === "pm" ? pmNavGroups : soldierNavGroups;
}

export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/receipts") {
    return pathname === "/receipts" || pathname.startsWith("/receipts/history");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitleForPath(pathname: string): string {
  const exact: Record<string, string> = {
    "/": "Home",
    "/my-property": "My section",
    "/property": "ODA property",
    "/sections": "ODA sections",
    "/receipts": "Hand receipts",
    "/loans": "DA Form 2062",
    "/receipts/2062-in": "Import (SHR, 2062, BOM)",
    "/exceptions": "Exceptions",
    "/documents": "Documents",
  };
  if (exact[pathname]) return exact[pathname];
  if (pathname.startsWith("/items/") || pathname.startsWith("/lines/")) return "Hand-receipt line";
  if (pathname.startsWith("/exceptions/")) return "Discrepancy";
  if (pathname.startsWith("/sections/")) return "Section Sub-hand receipt";
  if (pathname.startsWith("/receipts/2062-in/history")) return "2062 in history";
  if (pathname.startsWith("/receipts/history")) return "Sub-hand receipt history";
  return "ODA Property Workspace";
}
