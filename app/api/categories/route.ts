import { prisma } from "@/lib/prisma";
import { defaultIconValue, isCustomIcon } from "@/lib/icon-options";


export async function GET() {

    const categories = await prisma.categoryTemplate.findMany({

        where:{
            archived:false
        },

        orderBy:{
            sortOrder:"asc"
        }

    });


    return Response.json(categories);

}



export async function POST(request: Request) {

    const body = await request.json();
    const icon = isCustomIcon(body.icon) ? body.icon : defaultIconValue;


    const highestOrder = await prisma.categoryTemplate.aggregate({
        _max: {
            sortOrder: true,
        }
    });

    const category = await prisma.categoryTemplate.create({

        data: {

            name: body.name,

            type: body.type,

            icon,

            color: body.color ?? "slate",

            defaultBudgetAmount: Number(body.defaultBudgetAmount ?? 0) || 0,

            defaultBudgetCurrency: body.defaultBudgetCurrency ?? "SGD",

            sortOrder: (highestOrder._max.sortOrder ?? -1) + 1

        }

    });


    return Response.json(category);

}
