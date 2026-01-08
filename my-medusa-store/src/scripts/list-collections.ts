import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import fs from "fs";

export default async function listCollections({ container }: ExecArgs) {
    const productModuleService = container.resolve(Modules.PRODUCT);

    const categories = await productModuleService.listProductCategories({});
    const collections = await productModuleService.listProductCollections({});

    const data = {
        categories: categories.map((c: any) => ({ name: c.name, handle: c.handle, id: c.id })),
        collections: collections.map((c: any) => ({ title: c.title, handle: c.handle, id: c.id }))
    };

    fs.writeFileSync("C:/Users/code4/Desktop/medusa/backend-data.json", JSON.stringify(data, null, 2));
    console.log("Data written to backend-data.json");
}
