"use server";

import { revalidatePath } from "next/cache";
import {
  extractExpense as extractExpenseImpl,
  extractExpenseFromReceipt as extractExpenseFromReceiptImpl,
  saveExpense as saveExpenseImpl,
  type ExpenseCandidate,
} from "@/lib/expenses";

export async function extractExpenseAction(
  rawInput: string,
  referenceDateISO: string,
  inputMethod: "voice" | "text" = "text"
) {
  return extractExpenseImpl(rawInput, referenceDateISO, inputMethod);
}

export async function extractReceiptAction(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  referenceDateISO: string
) {
  return extractExpenseFromReceiptImpl(base64Image, mediaType, referenceDateISO);
}

export async function saveExpenseAction(
  candidate: Omit<ExpenseCandidate, "uncertainFields">
) {
  const result = await saveExpenseImpl(candidate);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/expenses");
  }
  return result;
}
