"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultAllocateIconValue, defaultIconValue, isCustomIcon } from "@/lib/icon-options";
import { buildMonthKey } from "@/lib/budgets";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";
import { revalidatePath } from "next/cache";

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

async function ensureAllocateMonthCategory(date: Date, tx: Prisma.TransactionClient) {
  const monthKey = buildMonthKey(date.getFullYear(), date.getMonth() + 1);
  const month = await ensureMonthSnapshot(monthKey);

  const highestOrder = await tx.categoryTemplate.aggregate({
    _max: { sortOrder: true },
  });
  const nextSortOrder = (highestOrder._max.sortOrder ?? -1) + 1;

  let template = await tx.categoryTemplate.findFirst({
    where: {
      name: "Allocate",
      type: "Allocate",
    },
    orderBy: { id: "asc" },
  });

  if (!template) {
    template = await tx.categoryTemplate.create({
      data: {
        name: "Allocate",
        type: "Allocate",
        icon: defaultAllocateIconValue,
        color: "slate",
        sortOrder: nextSortOrder,
        defaultBudgetAmount: 0,
        defaultBudgetCurrency: "SGD",
        archived: false,
      },
    });
  }

  const monthCategory = await tx.monthCategory.upsert({
    where: {
      monthId_templateCategoryId: {
        monthId: month.id,
        templateCategoryId: template.id,
      },
    },
    update: {},
    create: {
      monthId: month.id,
      templateCategoryId: template.id,
      name: template.name,
      type: template.type,
      icon: template.icon,
      color: template.color,
      sortOrder: template.sortOrder,
      archived: false,
      budgetAmount: template.defaultBudgetAmount,
      budgetCurrency: template.defaultBudgetCurrency,
    },
  });

  return monthCategory.id;
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
  const actualSpent = Math.round(Number(formData.get("actualSpent")) || 0);
  const overspendAmount = Math.max(0, Math.round(Number(formData.get("overspendAmount")) || 0));
  const overspendAccountId = Number(formData.get("overspendAccountId")) || 0;

  if (!goalId) {
    throw new Error("Missing required parameters for conclude.");
  }

  if (actualSpent <= 0) {
    throw new Error("Actual spent must be greater than zero.");
  }

  await prisma.$transaction(async (tx) => {
    const goal = await tx.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error("Goal not found.");
    if (goal.status === "Concluded" || goal.status === "Completed" || goal.status === "Complete") {
      throw new Error("Goal already concluded or completed.");
    }

    const allocations = await tx.transaction.findMany({
      where: {
        goalId,
        type: "Allocate",
        allocationState: { not: "Concluded" },
      },
      orderBy: { date: "asc" },
    });
    const totalAllocated = allocations.reduce((sum, allocation) => sum + (allocation.amount > 0 ? allocation.amount : 0), 0);

    if (actualSpent > totalAllocated) {
      const overspend = Math.max(0, actualSpent - totalAllocated);
      if (overspend > 0 && overspendAccountId > 0) {
        const account = await tx.account.findUnique({ where: { id: overspendAccountId }, select: { id: true } });
        if (!account) {
          throw new Error("Selected overspend account does not exist.");
        }

        const monthCategoryId = await ensureAllocateMonthCategory(new Date(), tx);
        await tx.transaction.create({
          data: {
            date: new Date(),
            name: `Goal top-up for ${goal.name}`,
            description: "Additional allocation created during goal conclusion to cover overspend.",
            tags: ["Goal", "Overspend", "Allocation"],
            amount: overspend,
            currency: goal.currency,
            type: "Allocate",
            accountId: overspendAccountId,
            toAccountId: null,
            goalId,
            allocationState: "Allocated",
            monthCategoryId,
          },
        });
      }
    }

    let remainingSpent = actualSpent;
    const sortedAllocations = [...allocations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const allocation of sortedAllocations) {
      const originalAmount = allocation.amount > 0 ? allocation.amount : 0;
      if (originalAmount <= 0) {
        await tx.transaction.update({
          where: { id: allocation.id },
          data: {
            allocationState: "Concluded",
            allocationOutcome: "Cancelled",
            allocationOutcomeAmount: 0,
          },
        });
        continue;
      }

      if (remainingSpent <= 0) {
        await tx.transaction.update({
          where: { id: allocation.id },
          data: {
            allocationState: "Concluded",
            allocationOutcome: "Released",
            allocationOutcomeAmount: originalAmount,
          },
        });
        continue;
      }

      const consumedFromThisAllocation = Math.min(originalAmount, remainingSpent);
      const outcome = consumedFromThisAllocation > 0 ? "Spent" : "Released";
      const outcomeAmount = consumedFromThisAllocation > 0 ? consumedFromThisAllocation : originalAmount;

      await tx.transaction.update({
        where: { id: allocation.id },
        data: {
          allocationState: "Concluded",
          allocationOutcome: outcome,
          allocationOutcomeAmount: outcomeAmount,
        },
      });

      remainingSpent = Math.max(0, remainingSpent - originalAmount);
    }

    await tx.goal.update({
      where: { id: goalId },
      data: { status: "Concluded", amountUsed: actualSpent },
    });
  });

  if (overspendAmount > 0 && overspendAccountId > 0) {
    revalidatePath("/transactions");
    revalidatePath("/accounts");
  }

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/goals");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

export async function undoGoalConclusion(formData: FormData) {
  const goalId = Number(formData.get("goalId"));

  if (!goalId) {
    throw new Error("Missing required parameters for undo conclusion.");
  }

  await prisma.$transaction(async (tx) => {
    const goal = await tx.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error("Goal not found.");
    if (goal.status !== "Concluded") {
      throw new Error("Goal is not currently concluded.");
    }

    const concludedAllocations = await tx.transaction.findMany({
      where: {
        goalId,
        type: "Allocate",
        allocationState: "Concluded",
      },
    });

    for (const allocation of concludedAllocations) {
      await tx.transaction.update({
        where: { id: allocation.id },
        data: {
          allocationState: "Allocated",
          allocationOutcome: null,
          allocationOutcomeAmount: 0,
        },
      });
    }

    const overspendTopUps = await tx.transaction.findMany({
      where: {
        goalId,
        type: "Allocate",
        description: "Additional allocation created during goal conclusion to cover overspend.",
      },
    });

    for (const topUp of overspendTopUps) {
      await tx.transaction.delete({ where: { id: topUp.id } });
    }

    const recalculatedAmountUsed = await tx.transaction.aggregate({
      where: { goalId },
      _sum: { amount: true },
    });

    await tx.goal.update({
      where: { id: goalId },
      data: {
        status: "Progressing",
        amountUsed: recalculatedAmountUsed._sum.amount ?? 0,
      },
    });
  });

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/goals");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}
