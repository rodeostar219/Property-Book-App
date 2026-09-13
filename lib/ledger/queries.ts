import { canViewSection } from "@/lib/oda/access";
import { documents, exceptions, loans, propertyItems, receiptPeriods, receipts } from "./fixtures";
import type { Actor, LedgerException, PropertyItem } from "./types";

export function getPropertyItem(id: string): PropertyItem | undefined {
  return propertyItems.find((item) => item.id === id);
}

export function getMyProperty(actor: Actor): PropertyItem[] {
  if (actor.scope === "section" && actor.sectionLetter) {
    return propertyItems.filter((item) => item.sectionLetter === actor.sectionLetter);
  }
  return propertyItems.filter((item) => item.assignedToId === actor.id);
}

export function getUnitProperty(actor?: Actor): PropertyItem[] {
  if (!actor || actor.role === "pm" || actor.scope === "oda") return propertyItems;
  return propertyItems.filter(
    (item) => item.sectionLetter && canViewSection(actor, item.sectionLetter),
  );
}

export function getExceptionsFor(actor: Actor): LedgerException[] {
  if (actor.role === "pm" || actor.scope === "oda") return exceptions;
  return exceptions.filter((row) => {
    if (row.sectionLetter) return canViewSection(actor, row.sectionLetter);
    return (
      row.assignedToId === actor.id ||
      (row.itemId &&
        propertyItems.some(
          (item) => item.id === row.itemId && item.assignedToId === actor.id,
        ))
    );
  });
}

export function getException(id: string): LedgerException | undefined {
  return exceptions.find((row) => row.id === id);
}

export function getReceipts() {
  return receipts;
}

export function getReceiptPeriods() {
  return receiptPeriods;
}

export function getLoans() {
  return loans;
}

export function getDocuments() {
  return documents;
}

export function onHandLabel(item: PropertyItem): string {
  if (item.status === "on_hand") {
    return `On hand (${item.quantityOnHand})`;
  }
  return "";
}
