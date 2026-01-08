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

    logger.info("--- Publishable API Keys ---");
    apiKeys.forEach((key: any) => {
        logger.info(`ID: ${key.id}`);
        logger.info(`Title: ${key.title}`);
        logger.info(`Token: ${key.token}`);
        logger.info(`Linked Sales Channels: ${key.sales_channels?.map((sc: any) => sc.name).join(", ") || "None"}`);
        logger.info("----------------------------");
    });
}
