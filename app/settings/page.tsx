import PageHeader from "@/components/PageHeader";
import SettingsClient from "@/components/SettingsClient";
import { prisma } from "@/lib/prisma";
import { defaultTransferIconValue } from "@/lib/icon-options";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const transferTemplate = await prisma.categoryTemplate.findFirst({
    where: { name: "Transfer", type: "Transfer" },
    orderBy: { id: "asc" },
    select: { icon: true },
  });

  return (
    <div className="space-y-5">
      <PageHeader breadcrumbs={[{ label: "Overview", href: "/" }, { label: "Settings" }]} title="Settings" description="Manage currencies, custom icons, and other preferences." />
      <SettingsClient initialTransferIcon={transferTemplate?.icon || defaultTransferIconValue} />
    </div>
  );
}
