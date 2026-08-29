"use server";

import { revalidatePath } from "next/cache";
import {
  updateExpense,
  deleteExpense,
  type ExpenseCandidate,
} from "@/lib/expenses";

export async function updateExpenseAction(
  id: string,
  candidate: Omit<ExpenseCandidate, "uncertainFields" | "rawInput">
) {
  const result = await updateExpense(id, candidate);
  if (result.ok) {
    revalidatePath("/expenses");
    revalidatePath("/");
  }
  return result;
}

export async function deleteExpenseAction(id: string) {
  const result = await deleteExpense(id);
  if (result.ok) {
    revalidatePath("/expenses");
    revalidatePath("/");
  }
  return result;
}
