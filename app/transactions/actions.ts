"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { buildMonthKey } from "@/lib/budgets";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";
import { defaultAllocateIconValue, defaultIconValue, defaultTransferIconValue } from "@/lib/icon-options";

function parseAmount(value: FormDataEntryValue | null) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function parseName(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseId(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isUnknownToAccountIdError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("Unknown argument `toAccountId`") || error.message.includes("Unknown argument `goalId`");
}

function isUnknownPrismaArgumentError(error: unknown, argNames: string[] | string) {
  if (!(error instanceof Error)) return false;
  const args = Array.isArray(argNames) ? argNames : [argNames];
  return args.some((a) => error.message.includes(`Unknown argument \`${a}\``));
}

function isMissingColumnError(error: unknown, columnNames: string[] | string) {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  if (!msg.includes("does not exist") && !msg.includes("doesn't exist")) return false;
  const cols = Array.isArray(columnNames) ? columnNames : [columnNames];
  return cols.some((c) => msg.includes(c.toLowerCase()));
}

async function syncGoalAmountUsed(tx: Prisma.TransactionClient, goalIds: number[]) {
  const uniqueGoalIds = [...new Set(goalIds.filter((goalId) => goalId > 0))];

  await Promise.all(
    uniqueGoalIds.map(async (goalId) => {
      const totals = await tx.transaction.aggregate({
        where: { goalId },
        _sum: { amount: true },
      });

      await tx.goal.update({
        where: { id: goalId },
        data: {
          amountUsed: totals._sum.amount ?? 0,
        },
      });
    })
  );
}

async function ensureAutoMonthCategory(date: Date, typeName: "Transfer" | "Allocate") {
  const monthKey = buildMonthKey(date.getFullYear(), date.getMonth() + 1);
  const month = await ensureMonthSnapshot(monthKey);

  return prisma.$transaction(async (tx) => {
    const highestOrder = await tx.categoryTemplate.aggregate({
      _max: { sortOrder: true },
    });
    const nextSortOrder = (highestOrder._max.sortOrder ?? -1) + 1;

    let template = await tx.categoryTemplate.findFirst({
      where: {
        name: typeName,
        type: typeName,
      },
      orderBy: { id: "asc" },
    });

    if (!template) {
      template = await tx.categoryTemplate.create({
        data: {
          name: typeName,
          type: typeName,
          icon: typeName === "Transfer" ? defaultTransferIconValue : defaultAllocateIconValue,
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
  });
}

async function resolveMonthCategoryForDate(date: Date, monthCategoryId: number) {
  const monthKey = buildMonthKey(date.getFullYear(), date.getMonth() + 1);
  await ensureMonthSnapshot(monthKey);

  return prisma.monthCategory.findFirst({
    where: {
      id: monthCategoryId,
      month: { key: monthKey },
      archived: false,
    },
  });
}

export async function createTransaction(formData: FormData) {
  const date = formData.get("date") as string;
  const rawName = parseName(formData.get("name"));
  const description = parseName(formData.get("description"));
  const amount = parseAmount(formData.get("amount"));
  const currency = formData.get("currency") as string;
  const tags = parseTags(formData.get("tags"));
  const selectedType = ((formData.get("type") as string | null) ?? "Expense").trim();
  const name = rawName || (selectedType === "Transfer" ? "New Transfer" : selectedType === "Income" ? "New Income" : "New Expense");
  const accountId = parseId(formData.get("accountId"));
  const monthCategoryId = parseId(formData.get("monthCategoryId"));
  const fromAccountId = parseId(formData.get("fromAccountId"));
  const toAccountId = parseId(formData.get("toAccountId"));
  const goalId = parseId(formData.get("goalId"));
  const parsedDate = new Date(date);

  if (selectedType === "Transfer") {
    if (!fromAccountId) {
      throw new Error("Transfer requires a source account.");
    }

    if (!toAccountId) {
      throw new Error("Transfer requires a destination account.");
    }

    if (goalId) {
      throw new Error("Transfers cannot target a goal. Use Allocate for goal earmarks.");
    }

    if (fromAccountId === toAccountId) {
      throw new Error("Transfer source and destination accounts must be different.");
    }

    const transferMonthCategoryId = await ensureAutoMonthCategory(parsedDate, "Transfer");

    await prisma.$transaction(async (tx) => {
      try {
        await tx.transaction.create({
          data: {
            date: parsedDate,
            name,
            description,
            tags,
            amount,
            currency,
            type: "Transfer",
            accountId: fromAccountId,
            toAccountId,
            goalId: null,
            monthCategoryId: transferMonthCategoryId,
          },
        });
      } catch (error) {
        if (!isUnknownToAccountIdError(error) && !isMissingColumnError(error, ["description", "tags"])) {
          throw error;
        }

        await prisma.$executeRaw(
          Prisma.sql`INSERT INTO "Transaction" ("date", "name", "amount", "currency", "type", "accountId", "toAccountId", "goalId", "monthCategoryId") VALUES (${parsedDate}, ${name}, ${amount}, ${currency}, 'Transfer', ${fromAccountId}, ${toAccountId}, NULL, ${transferMonthCategoryId})`
        );
      }
    });

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    return;
  }

  if (selectedType === "Allocate") {
    const sourceAccountId = fromAccountId || accountId;
    if (!sourceAccountId) {
      throw new Error("Allocate requires a source account.");
    }

    if (!goalId) {
      throw new Error("Allocate requires a goal.");
    }

    const allocateMonthCategoryId = await ensureAutoMonthCategory(parsedDate, "Allocate");
    const needSyncGoals: number[] = [];
    await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.findUnique({ where: { id: goalId }, select: { id: true } });
      if (!goal) {
        throw new Error("Selected goal does not exist.");
      }

      try {
        await tx.transaction.create({
          data: {
            date: parsedDate,
            name,
            description,
            tags,
            amount,
            currency,
            type: "Allocate",
            accountId: sourceAccountId,
            toAccountId: null,
            goalId,
            monthCategoryId: allocateMonthCategoryId,
          },
        });
        needSyncGoals.push(goalId);
      } catch (error) {
        if (!isUnknownToAccountIdError(error) && !isMissingColumnError(error, ["description", "tags"])) {
          throw error;
        }

        await prisma.$executeRaw(
          Prisma.sql`INSERT INTO "Transaction" ("date", "name", "amount", "currency", "type", "accountId", "toAccountId", "goalId", "monthCategoryId") VALUES (${parsedDate}, ${name}, ${amount}, ${currency}, 'Allocate', ${sourceAccountId}, NULL, ${goalId}, ${allocateMonthCategoryId})`
        );
        needSyncGoals.push(goalId);
      }
    });

    if (needSyncGoals.length > 0) {
      await prisma.$transaction(async (tx) => {
        await syncGoalAmountUsed(tx, needSyncGoals);
      });
    }

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/goals");
    return;
  }

  const monthCategory = await resolveMonthCategoryForDate(parsedDate, monthCategoryId);
  if (!monthCategory) {
    throw new Error("Selected category does not belong to the transaction month.");
  }

  if (monthCategory.type !== selectedType) {
    throw new Error("Selected category type does not match transaction type.");
  }

  try {
    await prisma.transaction.create({
      data: {
        date: parsedDate,
        name,
        description: parseName(formData.get("description")),
        tags: parseTags(formData.get("tags")),
        amount,
        currency,
        type: monthCategory.type,
        accountId,
        goalId: goalId || null,
        monthCategoryId,
      },
    });
  } catch (error) {
    if (isUnknownPrismaArgumentError(error, ["description", "tags"]) || isMissingColumnError(error, ["description", "tags"])) {
      // Fallback to raw SQL insert to avoid Prisma generating SQL that references missing columns.
      await prisma.$executeRaw(
        Prisma.sql`INSERT INTO "Transaction" ("date", "name", "amount", "currency", "type", "accountId", "goalId", "monthCategoryId") VALUES (${parsedDate}, ${name}, ${amount}, ${currency}, ${monthCategory.type}, ${accountId}, ${goalId ? goalId : null}, ${monthCategoryId})`
      );
    } else {
      throw error;
    }
  }

  if (goalId) {
    await prisma.$transaction(async (tx) => {
      await syncGoalAmountUsed(tx, [goalId]);
    });
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

export async function updateTransaction(formData: FormData) {
  const id = Number(formData.get("id"));
  const date = formData.get("date") as string;
  const name = parseName(formData.get("name"));
  const description = parseName(formData.get("description"));
  const amount = parseAmount(formData.get("amount"));
  const currency = formData.get("currency") as string;
  const tags = parseTags(formData.get("tags"));
  const selectedType = ((formData.get("type") as string | null) ?? "Expense").trim();
  let accountId = parseId(formData.get("accountId"));
  const monthCategoryId = parseId(formData.get("monthCategoryId"));
  let toAccountId = parseId(formData.get("toAccountId"));
  const goalId = parseId(formData.get("goalId"));
  const parsedDate = new Date(date);
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id },
    select: { goalId: true, accountId: true, toAccountId: true },
  });

  if (selectedType === "Transfer") {
    if (!accountId) {
      throw new Error("Transfer requires a source account.");
    }

    if (!toAccountId) {
      throw new Error("Transfer requires a destination account.");
    }

    if (goalId) {
      throw new Error("Transfers cannot target a goal. Use Allocate for goal earmarks.");
    }

    if (accountId === toAccountId) {
      const prevAccount = existingTransaction?.accountId ?? null;
      const prevToAccount = existingTransaction?.toAccountId ?? null;
      if (prevAccount && prevToAccount && prevAccount !== prevToAccount) {
        accountId = prevToAccount;
        toAccountId = prevAccount;
      } else {
        throw new Error("Transfer source and destination accounts must be different.");
      }
    }

    const transferMonthCategoryId = await ensureAutoMonthCategory(parsedDate, "Transfer");
    await prisma.$transaction(async (tx) => {
      try {
        await tx.transaction.update({
          where: { id },
          data: {
            date: parsedDate,
            name,
            description,
            tags,
            amount,
            currency,
            type: "Transfer",
            accountId,
            toAccountId,
            goalId: null,
            monthCategoryId: transferMonthCategoryId,
          },
        });
      } catch (error) {
        if (!isUnknownToAccountIdError(error) && !isMissingColumnError(error, ["description", "tags"])) {
          throw error;
        }

        await prisma.$executeRaw(
          Prisma.sql`UPDATE "Transaction" SET "date" = ${parsedDate}, "name" = ${name}, "amount" = ${amount}, "currency" = ${currency}, "type" = 'Transfer', "accountId" = ${accountId}, "toAccountId" = ${toAccountId}, "goalId" = NULL, "monthCategoryId" = ${transferMonthCategoryId} WHERE "id" = ${id}`
        );
      }
    });

    if (existingTransaction?.goalId) {
      await prisma.$transaction(async (tx) => {
        await syncGoalAmountUsed(tx, [existingTransaction.goalId ?? 0]);
      });
    }

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    if (existingTransaction?.goalId) {
      revalidatePath("/goals");
    }
    return;
  }

  if (selectedType === "Allocate") {
    const sourceAccountId = accountId || parseId(formData.get("fromAccountId"));
    if (!sourceAccountId) {
      throw new Error("Allocate requires a source account.");
    }

    if (!goalId) {
      throw new Error("Allocate requires a goal.");
    }

    const allocateMonthCategoryId = await ensureAutoMonthCategory(parsedDate, "Allocate");
    const needSyncGoals: number[] = [];
    await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.findUnique({ where: { id: goalId }, select: { id: true } });
      if (!goal) {
        throw new Error("Selected goal does not exist.");
      }

      try {
        await tx.transaction.update({
          where: { id },
          data: {
            date: parsedDate,
            name,
            description,
            tags,
            amount,
            currency,
            type: "Allocate",
            accountId: sourceAccountId,
            toAccountId: null,
            goalId,
            monthCategoryId: allocateMonthCategoryId,
          },
        });
        needSyncGoals.push(existingTransaction?.goalId ?? 0, goalId);
      } catch (error) {
        if (!isUnknownToAccountIdError(error) && !isMissingColumnError(error, ["description", "tags"])) {
          throw error;
        }

        await prisma.$executeRaw(
          Prisma.sql`UPDATE "Transaction" SET "date" = ${parsedDate}, "name" = ${name}, "amount" = ${amount}, "currency" = ${currency}, "type" = 'Allocate', "accountId" = ${sourceAccountId}, "toAccountId" = NULL, "goalId" = ${goalId}, "monthCategoryId" = ${allocateMonthCategoryId} WHERE "id" = ${id}`
        );
        needSyncGoals.push(existingTransaction?.goalId ?? 0, goalId);
      }
    });

    if (needSyncGoals.length > 0) {
      await prisma.$transaction(async (tx) => {
        await syncGoalAmountUsed(tx, needSyncGoals);
      });
    }

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/goals");
    return;
  }

  const monthCategory = await resolveMonthCategoryForDate(parsedDate, monthCategoryId);
  if (!monthCategory) {
    throw new Error("Selected category does not belong to the transaction month.");
  }

  if (monthCategory.type !== selectedType) {
    throw new Error("Selected category type does not match transaction type.");
  }

  const needSyncGoals: number[] = [];
  try {
    await prisma.transaction.update({
      where: { id },
      data: {
        date: parsedDate,
        name,
        description,
        tags,
        amount,
        currency,
        type: selectedType,
        accountId,
        toAccountId: null,
        goalId: goalId || null,
        monthCategoryId,
      },
    });
    needSyncGoals.push(existingTransaction?.goalId ?? 0, goalId);
  } catch (error) {
    if (isUnknownPrismaArgumentError(error, ["description", "tags"]) || isMissingColumnError(error, ["description", "tags"])) {
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "Transaction" SET "date" = ${parsedDate}, "name" = ${name}, "amount" = ${amount}, "currency" = ${currency}, "type" = ${selectedType}, "accountId" = ${accountId}, "toAccountId" = NULL, "goalId" = ${goalId ? goalId : null}, "monthCategoryId" = ${monthCategoryId} WHERE "id" = ${id}`
      );
      needSyncGoals.push(existingTransaction?.goalId ?? 0, goalId);
    } else {
      throw error;
    }
  }

  const uniqueNeedSync = [...new Set(needSyncGoals.filter((g) => g > 0))];
  if (uniqueNeedSync.length > 0) {
    await prisma.$transaction(async (tx) => {
      await syncGoalAmountUsed(tx, uniqueNeedSync);
    });
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  if (existingTransaction?.goalId) {
    revalidatePath("/goals");
  }
}

export async function deleteTransaction(formData: FormData) {
  const id = Number(formData.get("id"));
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id },
    select: { goalId: true },
  });

  await prisma.transaction.delete({
    where: { id },
  });

  if (existingTransaction?.goalId) {
    await prisma.$transaction(async (tx) => {
      await syncGoalAmountUsed(tx, [existingTransaction.goalId ?? 0]);
    });
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  if (existingTransaction?.goalId) {
    revalidatePath("/goals");
  }
}
