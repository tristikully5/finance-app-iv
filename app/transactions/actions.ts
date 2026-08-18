"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { buildMonthKey } from "@/lib/budgets";
import { ensureMonthSnapshot } from "@/lib/month-snapshots";
import { defaultIconValue, defaultTransferIconValue } from "@/lib/icon-options";

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

async function ensureTransferMonthCategories(date: Date) {
  const monthKey = buildMonthKey(date.getFullYear(), date.getMonth() + 1);
  const month = await ensureMonthSnapshot(monthKey);

  return prisma.$transaction(async (tx) => {
    const highestOrder = await tx.categoryTemplate.aggregate({
      _max: { sortOrder: true },
    });
    const nextSortOrder = (highestOrder._max.sortOrder ?? -1) + 1;

    let transferTemplate = await tx.categoryTemplate.findFirst({
      where: {
        name: "Transfer",
        type: "Transfer",
      },
      orderBy: { id: "asc" },
    });

    if (!transferTemplate) {
      transferTemplate = await tx.categoryTemplate.create({
        data: {
          name: "Transfer",
          type: "Transfer",
          icon: defaultTransferIconValue,
          color: "slate",
          sortOrder: nextSortOrder,
          defaultBudgetAmount: 0,
          defaultBudgetCurrency: "SGD",
          archived: false,
        },
      });
    }

    const transferMonthCategory = await tx.monthCategory.upsert({
      where: {
        monthId_templateCategoryId: {
          monthId: month.id,
          templateCategoryId: transferTemplate.id,
        },
      },
      update: {},
      create: {
        monthId: month.id,
        templateCategoryId: transferTemplate.id,
        name: transferTemplate.name,
        type: transferTemplate.type,
        icon: transferTemplate.icon,
        color: transferTemplate.color,
        sortOrder: transferTemplate.sortOrder,
        archived: false,
        budgetAmount: transferTemplate.defaultBudgetAmount,
        budgetCurrency: transferTemplate.defaultBudgetCurrency,
      },
    });

    return transferMonthCategory.id;
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

    if (!toAccountId && !goalId) {
      throw new Error("Transfer requires a destination account or a goal.");
    }

    if (toAccountId && goalId) {
      throw new Error("Transfer can go to an account or a goal, but not both.");
    }

    if (toAccountId && fromAccountId === toAccountId) {
      throw new Error("Transfer source and destination accounts must be different.");
    }

    const transferMonthCategoryId = await ensureTransferMonthCategories(parsedDate);

    const needSyncGoals: number[] = [];
    await prisma.$transaction(async (tx) => {
      if (goalId) {
        const goal = await tx.goal.findUnique({ where: { id: goalId }, select: { id: true } });
        if (!goal) {
          throw new Error("Selected goal does not exist.");
        }
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
            type: "Transfer",
            accountId: fromAccountId,
            toAccountId: toAccountId || null,
            goalId: goalId || null,
            monthCategoryId: transferMonthCategoryId,
          },
        });
        if (goalId) needSyncGoals.push(goalId);
      } catch (error) {
        if (!isUnknownToAccountIdError(error) && !isMissingColumnError(error, ["description", "tags"])) {
          throw error;
        }

        // Fallback for stale Prisma client processes or DBs missing new columns: insert without description/tags.
        await prisma.$executeRaw(
          Prisma.sql`INSERT INTO "Transaction" ("date", "name", "amount", "currency", "type", "accountId", "toAccountId", "goalId", "monthCategoryId") VALUES (${parsedDate}, ${name}, ${amount}, ${currency}, 'Transfer', ${fromAccountId}, ${toAccountId || null}, ${goalId || null}, ${transferMonthCategoryId})`
        );
        if (goalId) needSyncGoals.push(goalId);
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
        monthCategoryId,
      },
    });
  } catch (error) {
    if (isUnknownPrismaArgumentError(error, ["description", "tags"]) || isMissingColumnError(error, ["description", "tags"])) {
      // Fallback to raw SQL insert to avoid Prisma generating SQL that references missing columns.
      await prisma.$executeRaw(
        Prisma.sql`INSERT INTO "Transaction" ("date", "name", "amount", "currency", "type", "accountId", "monthCategoryId") VALUES (${parsedDate}, ${name}, ${amount}, ${currency}, ${monthCategory.type}, ${accountId}, ${monthCategoryId})`
      );
    } else {
      throw error;
    }
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

    if (!toAccountId && !goalId) {
      throw new Error("Transfer requires a destination account or a goal.");
    }

    if (toAccountId && goalId) {
      throw new Error("Transfer can go to an account or a goal, but not both.");
    }

    if (toAccountId && accountId === toAccountId) {
      // If user selected the same account for source and destination while editing,
      // swap the accounts using the existing transaction's account values so the
      // transfer direction is reversed instead of failing.
      const prevAccount = existingTransaction?.accountId ?? null;
      const prevToAccount = existingTransaction?.toAccountId ?? null;
      if (prevAccount && prevToAccount && prevAccount !== prevToAccount) {
        accountId = prevToAccount;
        // if previous toAccount was null, keep current toAccountId
        toAccountId = prevAccount;
      } else {
        throw new Error("Transfer source and destination accounts must be different.");
      }
    }

    const transferMonthCategoryId = await ensureTransferMonthCategories(parsedDate);
    const needSyncGoals: number[] = [];
    await prisma.$transaction(async (tx) => {
      if (goalId) {
        const goal = await tx.goal.findUnique({ where: { id: goalId }, select: { id: true } });
        if (!goal) {
          throw new Error("Selected goal does not exist.");
        }
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
            type: "Transfer",
            accountId,
            toAccountId: toAccountId || null,
            goalId: goalId || null,
            monthCategoryId: transferMonthCategoryId,
          },
        });
        needSyncGoals.push(existingTransaction?.goalId ?? 0, goalId);
      } catch (error) {
        if (!isUnknownToAccountIdError(error) && !isMissingColumnError(error, ["description", "tags"])) {
          throw error;
        }

        await prisma.$executeRaw(
          Prisma.sql`UPDATE "Transaction" SET "date" = ${parsedDate}, "name" = ${name}, "amount" = ${amount}, "currency" = ${currency}, "type" = 'Transfer', "accountId" = ${accountId}, "toAccountId" = ${toAccountId || null}, "goalId" = ${goalId || null}, "monthCategoryId" = ${transferMonthCategoryId} WHERE "id" = ${id}`
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
        goalId: null,
        monthCategoryId,
      },
    });
  } catch (error) {
    if (isUnknownPrismaArgumentError(error, ["description", "tags"]) || isMissingColumnError(error, ["description", "tags"])) {
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "Transaction" SET "date" = ${parsedDate}, "name" = ${name}, "amount" = ${amount}, "currency" = ${currency}, "type" = ${selectedType}, "accountId" = ${accountId}, "toAccountId" = NULL, "goalId" = NULL, "monthCategoryId" = ${monthCategoryId} WHERE "id" = ${id}`
      );
    } else {
      throw error;
    }
  }

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
