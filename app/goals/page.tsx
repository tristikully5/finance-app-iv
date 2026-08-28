import { prisma } from "@/lib/prisma";
import GoalsBoard from "@/components/GoalsBoard";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  let goals: Array<{
    id: number;
    name: string;
    icon: string;
    amount: number;
    currency?: string;
    targetDate?: Date | null;
    description: string | null;
    status: string;
    amountUsed: number;
    allocations: Array<{ amount: number; type: string; allocationState?: string | null; allocationOutcome?: string | null; allocationOutcomeAmount?: number | null }>;
  }> = [];
  let loadError = false;

  try {
    goals = await prisma.goal.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        allocations: {
          select: {
            amount: true,
            type: true,
            allocationState: true,
            allocationOutcome: true,
            allocationOutcomeAmount: true,
          },
        },
      },
    });
  } catch (error) {
    loadError = true;
    console.error("Failed to load goals:", error);
  }

  const normalizedGoals = goals.map((goal) => {
    const allocated = goal.allocations.reduce((sum, transaction) => sum + (transaction.amount > 0 ? transaction.amount : 0), 0);
    const spent = goal.allocations.reduce((sum, transaction) => sum + (transaction.amount < 0 ? Math.abs(transaction.amount) : 0), 0);
    const finalSpent = goal.status === "Concluded" ? goal.amountUsed : spent;

    return {
      ...goal,
      allocated,
      spent: finalSpent,
    };
  });

  if (loadError) {
    return (
      <div className="space-y-5">
        <PageHeader breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Goals" }]} title="Goals" description="Track target amounts and mark them complete when you are done." />
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">Unable to load goals right now. Please make sure the database schema includes the Goal model and the DATABASE_URL points to a reachable PostgreSQL database.</div>
      </div>
    );
  }

  return <GoalsBoard goals={normalizedGoals} />;
}
