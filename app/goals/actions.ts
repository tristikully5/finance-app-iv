"use server";

import { prisma } from "@/lib/prisma";
import { defaultIconValue, isCustomIcon } from "@/lib/icon-options";
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

    const allocations = await tx.transaction.findMany({ where: { goalId }, orderBy: { date: "asc" } });
    const totalAllocated = allocations.reduce((s, a) => s + (a.amount > 0 ? a.amount : 0), 0);

    if (actualSpent > totalAllocated) {
      throw new Error("Actual spent exceeds allocated total. Please top up allocations before concluding.");
    }

    for (const allocation of allocations) {
      try {
        await tx.transaction.update({ where: { id: allocation.id }, data: { goalId: null } });
      } catch (e) {
        // ignore
      }
    }

    await tx.goal.update({
      where: { id: goalId },
      data: { status: "Concluded", amountUsed: actualSpent },
    });
  });

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/goals");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}
