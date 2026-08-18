"use server";

import { revalidatePath } from "next/cache";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";

export async function createMonth(formData: FormData) {
  const monthKey = String(formData.get("month") ?? "").trim();

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    throw new Error("Select a valid month.");
  }

  await ensureMonthSnapshot(monthKey);
  revalidatePath("/budgets");
  revalidatePath("/categories");
}
