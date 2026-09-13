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
  pmOnly?: boolean;
};

export const soldierNav: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/my-property", label: "My property", icon: Package },
  { href: "/exceptions", label: "Exceptions", icon: AlertTriangle, badgeKey: "exceptions" },
];

export const pmNav: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/my-property", label: "My property", icon: Package },
  { href: "/property", label: "Unit property", icon: Boxes, pmOnly: true },
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
    "/my-property": "My property",
    "/property": "Unit property",
    "/receipts": "Hand receipts",
    "/loans": "DA Form 2062",
    "/exceptions": "Exceptions",
    "/documents": "Documents",
  };
  if (exact[pathname]) return exact[pathname];
  if (pathname.startsWith("/items/")) return "End item";
  if (pathname.startsWith("/exceptions/")) return "Exception";
  return "Property Ledger";
}
