"use server";

import { revalidatePath } from "next/cache";
import {
  extractExpense as extractExpenseImpl,
  saveExpense as saveExpenseImpl,
  type ExpenseCandidate,
} from "@/lib/expenses";

export async function extractExpenseAction(
  rawInput: string,
  referenceDateISO: string
) {
  return extractExpenseImpl(rawInput, referenceDateISO);
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
