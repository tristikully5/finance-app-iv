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
  const status = submittedStatus === "Completed" || submittedStatus === "On hold" ? submittedStatus : "Progressing";

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
