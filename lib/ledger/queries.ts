import {
  documents,
  exceptions,
  loans,
  propertyItems,
  receiptPeriods,
  receipts,
} from "./fixtures";
import type { Actor, LedgerException, PropertyItem } from "./types";

export function getPropertyItem(id: string): PropertyItem | undefined {
  return propertyItems.find((item) => item.id === id);
}

export function getMyProperty(actor: Actor): PropertyItem[] {
  return propertyItems.filter((item) => item.assignedToId === actor.id);
}

export function getUnitProperty(): PropertyItem[] {
  return propertyItems;
}

export function getExceptionsFor(actor: Actor): LedgerException[] {
  if (actor.role === "pm") return exceptions;
  return exceptions.filter(
    (row) =>
      row.assignedToId === actor.id ||
      (row.itemId &&
        propertyItems.some(
          (item) => item.id === row.itemId && item.assignedToId === actor.id,
        )),
  );
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
