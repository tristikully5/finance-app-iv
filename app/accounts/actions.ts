"use server";

import { prisma } from "@/lib/prisma";
import { defaultIconValue, isCustomIcon } from "@/lib/icon-options";
import { revalidatePath } from "next/cache";


export async function createAccount(formData: FormData) {

    const name = ((formData.get("name") as string | null)?.trim() || "New Account") as string;
    const type = formData.get("type") as string;
    const currency = formData.get("currency") as string;
    const submittedIcon = formData.get("icon");
    const icon = typeof submittedIcon === "string" && isCustomIcon(submittedIcon) ? submittedIcon : defaultIconValue;

    try {
        console.log("createAccount called", { name, type, currency, icon });
        await prisma.account.create({
            data: {
                name,
                type,
                currency,
                icon,
            },
        });
        console.log("createAccount: created with icon");
        revalidatePath("/accounts");
        return { ok: true };
    } catch (error) {
        // If the generated Prisma client/schema doesn't include icon, retry without it
        if (error instanceof Error && error.message.includes("Unknown argument `icon`")) {
            console.warn("createAccount: icon not supported by Prisma client, retrying without icon");
            await prisma.account.create({
                data: { name, type, currency },
            });
            revalidatePath("/accounts");
            return { ok: true, warning: "icon-not-saved" };
        } else {
            throw error;
        }
    }
}



export async function updateAccount(
    formData: FormData
){

    const id = Number(formData.get("id"));

    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const currency = formData.get("currency") as string;
    const submittedIcon = formData.get("icon");
    const icon = typeof submittedIcon === "string" && isCustomIcon(submittedIcon) ? submittedIcon : defaultIconValue;

    try {
        console.log("updateAccount called", { id, name, type, currency, icon });
        await prisma.account.update({
            where: { id },
            data: { name, type, currency, icon },
        });
        console.log("updateAccount: updated with icon");
        revalidatePath("/accounts");
        return { ok: true };
    } catch (error) {
        // Retry without icon if the Prisma client doesn't support it
        if (error instanceof Error && error.message.includes("Unknown argument `icon`")) {
            console.warn("updateAccount: icon not supported by Prisma client, retrying without icon");
            await prisma.account.update({
                where: { id },
                data: { name, type, currency },
            });
            revalidatePath("/accounts");
            return { ok: true, warning: "icon-not-saved" };
        } else {
            throw error;
        }
    }

}



export async function archiveAccount(
    formData: FormData
){

    const id = Number(formData.get("id"));


    await prisma.account.update({

        where:{
            id
        },

        data:{
            archived:true
        }

    });


    revalidatePath("/accounts");
    return { ok: true };

}
