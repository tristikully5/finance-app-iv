"use server";

import { prisma } from "@/lib/prisma";
import { defaultIconValue, isCustomIcon } from "@/lib/icon-options";
import { revalidatePath } from "next/cache";
import { buildMonthKey } from "@/lib/budgets";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";

function parseName(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseAmount(value: FormDataEntryValue | null) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function parseCurrency(value: FormDataEntryValue | null) {
  return value === "USD" || value === "EUR" ? value : "SGD";
}

function parseTargetDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDescription(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

export async function createGoal(formData: FormData) {
  const name = parseName(formData.get("name")) || "New Goal";
  const amount = parseAmount(formData.get("amount"));
  const currency = parseCurrency(formData.get("currency"));
  const targetDate = parseTargetDate(formData.get("targetDate"));
  const description = parseDescription(formData.get("description"));
  const submittedIcon = formData.get("icon");
  const icon = typeof submittedIcon === "string" && isCustomIcon(submittedIcon) ? submittedIcon : defaultIconValue;

  await prisma.goal.create({
    data: {
      name,
      icon,
      amount,
      currency,
      targetDate,
      description,
      status: "Progressing",
      amountUsed: 0,
    },
  });

  revalidatePath("/goals");
}

export async function updateGoal(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = parseName(formData.get("name")) || "New Goal";
  const amount = parseAmount(formData.get("amount"));
  const currency = parseCurrency(formData.get("currency"));
  const targetDate = parseTargetDate(formData.get("targetDate"));
  const description = parseDescription(formData.get("description"));
  const submittedIcon = formData.get("icon");
  const icon = typeof submittedIcon === "string" && isCustomIcon(submittedIcon) ? submittedIcon : defaultIconValue;
  const submittedStatus = formData.get("status");
  const status = submittedStatus === "Completed" || submittedStatus === "Concluded" || submittedStatus === "On hold" ? submittedStatus : "Progressing";

  if (!id) {
    return;
  }

  await prisma.goal.update({
    where: { id },
    data: {
      name,
      icon,
      amount,
      currency,
      targetDate,
      description,
      status,
    },
  });

  revalidatePath("/goals");
}

export async function deleteGoal(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) {
    return;
  }

  await prisma.goal.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/transactions");
}

export async function concludeGoal(formData: FormData) {
  const goalId = Number(formData.get("goalId"));
  const accountId = Number(formData.get("accountId"));
  const actualSpent = Math.round(Number(formData.get("actualSpent")) || 0);

  if (!goalId || !accountId) {
    throw new Error("Missing required parameters for conclude.");
  }

  if (actualSpent <= 0) {
    throw new Error("Actual spent must be greater than zero.");
  }

  // run transactional work
  await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error("Goal not found.");
      if (goal.status === "Concluded" || goal.status === "Completed" || goal.status === "Complete") throw new Error("Goal already concluded or completed.");

    const allocations = await tx.transaction.findMany({ where: { goalId }, orderBy: { date: "asc" } });
    const totalAllocated = allocations.reduce((s, a) => s + (a.amount > 0 ? a.amount : 0), 0);

    if (actualSpent > totalAllocated) {
      throw new Error("Actual spent exceeds allocated total. Please top up allocations before concluding.");
    }

    // ensure month snapshot and find an Expense monthCategory for today
    const today = new Date();
    const monthKey = buildMonthKey(today.getFullYear(), today.getMonth() + 1);
    await ensureMonthSnapshot(monthKey);
    const month = await tx.month.findUnique({ where: { key: monthKey } });

      // prefer provided monthCategoryId if it belongs to this month; otherwise fall back to a month's Expense category
      let providedMonthCategoryId = Number(formData.get("monthCategoryId") || 0);
      let finalMonthCategoryId: number | undefined;

      if (providedMonthCategoryId && month) {
        const providedCat = await tx.monthCategory.findUnique({ where: { id: providedMonthCategoryId } });
        if (providedCat && providedCat.monthId === month.id && providedCat.type === "Expense") {
          finalMonthCategoryId = providedCat.id;
        }
      }

      if (!finalMonthCategoryId && month) {
        const monthCategory = await tx.monthCategory.findFirst({ where: { monthId: month.id, type: "Expense" } });
        finalMonthCategoryId = monthCategory?.id ?? undefined;
      }

      if (!finalMonthCategoryId) {
        throw new Error("No expense category is available for the current month.");
      }

      // create single expense transaction for actualSpent
      await tx.transaction.create({
        data: {
          date: today,
          name: `Conclude Goal: ${goal.name}`,
          description: `Concluded goal ${goal.name}`,
          tags: [],
          amount: Math.abs(actualSpent),
          currency: goal.currency,
          type: "Expense",
          accountId: accountId,
          goalId: goalId,
          monthCategoryId: finalMonthCategoryId,
        },
      });

    // unlink allocations by clearing their goalId (mark as cleared)
    const allocationIds = allocations.map((a) => a.id);
    for (const id of allocationIds) {
      try {
        await tx.transaction.update({ where: { id }, data: { goalId: null } });
      } catch (e) {
        // ignore
      }
    }

    // mark goal concluded and set amountUsed to the actual spent amount (positive)
    await tx.goal.update({ where: { id: goalId }, data: { status: "Concluded", amountUsed: actualSpent } });
  });

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/goals");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}
