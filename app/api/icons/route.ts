import { readdir } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const iconDirectory = path.join(process.cwd(), "public", "icons");
  const fileNames = (await readdir(iconDirectory)).filter((fileName) => /\.png$/i.test(fileName)).sort();

  return Response.json(fileNames.map((fileName) => ({
    value: `/icons/${fileName}`,
    label: fileName,
  })));
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const value = typeof body?.value === "string" ? body.value : null;
    if (!value || !/^\/icons\/[^/]+\.png$/i.test(value)) {
      return new Response(JSON.stringify({ error: "Invalid icon path." }), { status: 400 });
    }

    const { defaultIconValue } = await import("@/lib/icon-options");
    if (value === defaultIconValue) {
      return new Response(JSON.stringify({ error: "Cannot delete the default icon." }), { status: 400 });
    }

    const fileName = value.replace(/^\/icons\//, "");
    const iconPath = path.join(process.cwd(), "public", "icons", fileName);
    await import("node:fs/promises").then((fs) => fs.unlink(iconPath));

    // Revalidate pages that list icons
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/categories");
      revalidatePath("/accounts");
      revalidatePath("/goals");
    } catch (e) {
      // ignore revalidation failures
    }

    return new Response(JSON.stringify({ ok: true }));
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to delete icon." }), { status: 500 });
  }
}
