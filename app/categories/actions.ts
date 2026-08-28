"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";
import { defaultAllocateColorValue, defaultAllocateIconValue, defaultExpenseColorValue, defaultIconValue, defaultIncomeColorValue, defaultTransferColorValue, defaultTransferIconValue, isCustomIcon, isHexColor } from "@/lib/icon-options";

export async function uploadCustomIcon(formData: FormData) {
  const file = formData.get("icon");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PNG file to upload." };
  }

  if (file.size > 2 * 1024 * 1024 || file.type !== "image/png" || !file.name.toLowerCase().endsWith(".png")) {
    return { error: "Icons must be PNG files smaller than 2 MB." };
  }

  const contents = Buffer.from(await file.arrayBuffer());
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (contents.length < pngSignature.length || !contents.subarray(0, pngSignature.length).equals(pngSignature)) {
    return { error: "The uploaded file is not a valid PNG." };
  }

  const baseName = file.name.replace(/[^a-z0-9-_]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "custom-icon";
  const fileName = `${baseName}-${randomUUID()}.png`;
  const iconsDirectory = path.join(process.cwd(), "public", "icons");
  await mkdir(iconsDirectory, { recursive: true });
  await writeFile(path.join(iconsDirectory, fileName), contents, { flag: "wx" });

  revalidatePath("/categories");
  revalidatePath("/accounts");
  return { icon: `/icons/${fileName}`, label: fileName };
}

export async function updateTransferIcon(formData: FormData) {
  const submittedIcon = (formData.get("icon") as string | null)?.trim();
  const submittedColor = ((formData.get("color") as string | null)?.trim() || "").toLowerCase();
  const icon = isCustomIcon(submittedIcon) ? submittedIcon : defaultTransferIconValue;
  const color = isHexColor(submittedColor) ? submittedColor : defaultTransferColorValue;

  const transferTemplate = await prisma.categoryTemplate.findFirst({
    where: {
      name: "Transfer",
      type: "Transfer",
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (transferTemplate) {
    await prisma.$transaction([
      prisma.categoryTemplate.update({
        where: { id: transferTemplate.id },
        data: { icon, color },
      }),
      prisma.monthCategory.updateMany({
        where: { templateCategoryId: transferTemplate.id },
        data: { icon, color },
      }),
    ]);
  } else {
    const highestOrder = await prisma.categoryTemplate.aggregate({
      _max: { sortOrder: true },
    });

    await prisma.categoryTemplate.create({
      data: {
        name: "Transfer",
        type: "Transfer",
        icon,
        color,
        sortOrder: (highestOrder._max.sortOrder ?? -1) + 1,
        defaultBudgetAmount: 0,
        defaultBudgetCurrency: "SGD",
        archived: false,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath("/transactions");
  return { success: true, icon, color };
}

export async function updateAllocateIcon(formData: FormData) {
  const submittedIcon = (formData.get("icon") as string | null)?.trim();
  const submittedColor = ((formData.get("color") as string | null)?.trim() || "").toLowerCase();
  const icon = isCustomIcon(submittedIcon) ? submittedIcon : defaultAllocateIconValue;
  const color = isHexColor(submittedColor) ? submittedColor : defaultAllocateColorValue;

  const allocateTemplate = await prisma.categoryTemplate.findFirst({
    where: {
      name: "Allocate",
      type: "Allocate",
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (allocateTemplate) {
    await prisma.$transaction([
      prisma.categoryTemplate.update({
        where: { id: allocateTemplate.id },
        data: { icon, color },
      }),
      prisma.monthCategory.updateMany({
        where: { templateCategoryId: allocateTemplate.id },
        data: { icon, color },
      }),
    ]);
  } else {
    const highestOrder = await prisma.categoryTemplate.aggregate({
      _max: { sortOrder: true },
    });

    await prisma.categoryTemplate.create({
      data: {
        name: "Allocate",
        type: "Allocate",
        icon,
        color,
        sortOrder: (highestOrder._max.sortOrder ?? -1) + 1,
        defaultBudgetAmount: 0,
        defaultBudgetCurrency: "SGD",
        archived: false,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath("/transactions");
  return { success: true, icon, color };
}

export async function createCategory(formData: FormData) {
  const name = ((formData.get("name") as string | null)?.trim() || "New Category") as string;
  const type = ((formData.get("type") as string | null)?.trim() || "Expense") as string;
  const submittedIcon = (formData.get("icon") as string | null)?.trim();
  const submittedColor = ((formData.get("color") as string | null)?.trim() || "").toLowerCase();
  const icon = isCustomIcon(submittedIcon) ? submittedIcon : defaultIconValue;
  const color = isHexColor(submittedColor)
    ? submittedColor
    : type === "Expense" ? defaultExpenseColorValue : type === "Income" ? defaultIncomeColorValue : "#64748b";
  const defaultBudgetAmount = Number(formData.get("defaultBudgetAmount") || 0);
  const defaultBudgetCurrency = ((formData.get("defaultBudgetCurrency") as string | null)?.trim() || "SGD") as string;

  const highestOrder = await prisma.categoryTemplate.aggregate({
    _max: { sortOrder: true },
  });

  await prisma.categoryTemplate.create({
    data: {
      name,
      type,
      icon,
      color,
      defaultBudgetAmount: type === "Expense" && defaultBudgetAmount > 0 ? defaultBudgetAmount : 0,
      defaultBudgetCurrency,
      sortOrder: (highestOrder._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function updateCategory(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = ((formData.get("name") as string | null)?.trim() || "New Category") as string;
  const type = ((formData.get("type") as string | null)?.trim() || "Expense") as string;
  const submittedIcon = (formData.get("icon") as string | null)?.trim();
  const icon = isCustomIcon(submittedIcon) ? submittedIcon : defaultIconValue;
  const color = ((formData.get("color") as string | null)?.trim() || "slate") as string;
  const sortOrder = Number(formData.get("sortOrder") || 0);
  const hasBudget = formData.has("budgetAmount");
  const budgetAmount = Number(formData.get("budgetAmount") || 0);
  const budgetCurrency = ((formData.get("budgetCurrency") as string | null)?.trim() || "SGD") as string;
  const monthCategory = await prisma.monthCategory.findUniqueOrThrow({
    where: { id },
    select: { templateCategoryId: true },
  });

  await prisma.$transaction([
    prisma.monthCategory.update({
      where: { id },
      data: {
        name,
        type,
        icon,
        color,
        sortOrder,
        ...(type === "Expense" && hasBudget ? { budgetAmount: budgetAmount > 0 ? budgetAmount : 0, budgetCurrency } : { budgetAmount: 0, budgetCurrency: "SGD" }),
      },
    }),
    prisma.categoryTemplate.update({
      where: { id: monthCategory.templateCategoryId },
      data: {
        name,
        type,
        icon,
        color,
      },
    }),
  ]);

  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function unarchiveCategory(formData: FormData) {
  const id = Number(formData.get("id"));
  const category = await prisma.monthCategory.findUniqueOrThrow({
    where: { id },
    select: {
      templateCategoryId: true,
      name: true,
      type: true,
      icon: true,
      color: true,
      sortOrder: true,
      budgetAmount: true,
      budgetCurrency: true,
      templateCategory: {
        select: {
          defaultBudgetAmount: true,
          defaultBudgetCurrency: true,
        },
      },
    },
  });
  const months = await prisma.month.findMany({ select: { id: true } });
  const existingCategories = await prisma.monthCategory.findMany({
    where: { templateCategoryId: category.templateCategoryId },
    select: { monthId: true },
  });
  const existingMonthIds = new Set(existingCategories.map((monthCategory) => monthCategory.monthId));

  await prisma.$transaction([
    prisma.monthCategory.update({
      where: { id },
      data: { archived: false },
    }),
    prisma.monthCategory.createMany({
      data: months
        .filter((month) => !existingMonthIds.has(month.id))
        .map((month) => ({
          monthId: month.id,
          templateCategoryId: category.templateCategoryId,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          sortOrder: category.sortOrder,
          archived: false,
          budgetAmount: category.type === "Expense" ? category.templateCategory.defaultBudgetAmount : 0,
          budgetCurrency: category.type === "Expense" ? category.templateCategory.defaultBudgetCurrency : "SGD",
        })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/categories");
  revalidatePath("/budgets");
  revalidatePath("/transactions");
}

export async function archiveCategory(formData: FormData) {
  const id = Number(formData.get("id"));
  const monthKey = (formData.get("monthKey") as string | null)?.trim();

  await prisma.monthCategory.update({
    where: { id },
    data: {
      archived: true,
    },
  });

  revalidatePath("/categories");
  revalidatePath("/transactions");
  if (monthKey) {
    revalidatePath(`/budgets/${monthKey}`);
  }
}

export async function saveCategoryBudget(formData: FormData) {
  const monthCategoryId = Number(formData.get("monthCategoryId"));
  const monthKey = (formData.get("monthKey") as string | null)?.trim() || "";
  const amount = Number(formData.get("amount") || 0);
  const currency = ((formData.get("currency") as string | null)?.trim() || "SGD") as string;

  if (!monthCategoryId || !monthKey) {
    return;
  }

  await ensureMonthSnapshot(monthKey);
  const monthCategory = await prisma.monthCategory.findUniqueOrThrow({ where: { id: monthCategoryId }, select: { type: true } });
  if (monthCategory.type !== "Expense") {
    return;
  }

  await prisma.monthCategory.update({
    where: { id: monthCategoryId },
    data: {
      budgetAmount: amount,
      budgetCurrency: currency,
    },
  });

  revalidatePath("/categories");
}

export async function applyTemplateBudgetToMonth(formData: FormData) {
  const monthKey = (formData.get("monthKey") as string | null)?.trim() || "";

  if (!monthKey) {
    return;
  }

  await ensureMonthSnapshot(monthKey);

  revalidatePath("/categories");
}
