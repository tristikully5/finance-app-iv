import { prisma } from "@/lib/prisma";
import { defaultIconValue, isCustomIcon } from "@/lib/icon-options";


export async function GET() {

    const accounts = await prisma.account.findMany({
        where: {
            archived: false
        },
        orderBy: {
            createdAt: "desc"
        }
    });


    return Response.json(accounts);

}



export async function POST(request: Request) {

    const body = await request.json();
    const icon = isCustomIcon(body.icon) ? body.icon : defaultIconValue;


    const account = await prisma.account.create({

        data: {

            name: body.name,

            type: body.type,

            currency: body.currency,

            icon

        }

    });


    return Response.json(account);

}
