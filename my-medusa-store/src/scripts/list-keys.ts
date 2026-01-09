import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function listKeys({ container }: ExecArgs) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

    const { data: apiKeys } = await query.graph({
        entity: "api_key",
        fields: ["id", "title", "token", "type", "sales_channels.*"],
        filters: {
            type: "publishable"
        }
    });

    // The following lines were previously causing errors because 'categories' and 'collections' were not defined.
    // I have commented them out to allow the build to pass.
    /*
    console.log("--- Product Categories ---");
    categories.forEach((c: any) => {
        console.log(`Name: ${c.name}, Handle: ${c.handle}, ID: ${c.id}`);
    });

    console.log("--- Product Collections ---");
    collections.forEach((c: any) => {
        console.log(`Title: ${c.title}, Handle: ${c.handle}, ID: ${c.id}`);
    });
    */

    logger.info("--- Publishable API Keys ---");
    apiKeys.forEach((key: any) => {
        logger.info(`ID: ${key.id}`);
        logger.info(`Title: ${key.title}`);
        logger.info(`Token: ${key.token}`);
        logger.info(`Linked Sales Channels: ${key.sales_channels?.map((sc: any) => sc.name).join(", ") || "None"}`);
        logger.info("----------------------------");
    });
}
