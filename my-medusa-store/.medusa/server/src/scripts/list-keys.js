"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listKeys;
const utils_1 = require("@medusajs/framework/utils");
async function listKeys({ container }) {
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
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
    apiKeys.forEach((key) => {
        logger.info(`ID: ${key.id}`);
        logger.info(`Title: ${key.title}`);
        logger.info(`Token: ${key.token}`);
        logger.info(`Linked Sales Channels: ${key.sales_channels?.map((sc) => sc.name).join(", ") || "None"}`);
        logger.info("----------------------------");
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdC1rZXlzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3NjcmlwdHMvbGlzdC1rZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBR0EsMkJBa0NDO0FBcENELHFEQUErRTtBQUVoRSxLQUFLLFVBQVUsUUFBUSxDQUFDLEVBQUUsU0FBUyxFQUFZO0lBQzFELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakUsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUVuRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUN4QyxNQUFNLEVBQUUsU0FBUztRQUNqQixNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUM7UUFDNUQsT0FBTyxFQUFFO1lBQ0wsSUFBSSxFQUFFLGFBQWE7U0FDdEI7S0FDSixDQUFDLENBQUM7SUFFSCw4R0FBOEc7SUFDOUcsd0RBQXdEO0lBQ3hEOzs7Ozs7Ozs7O01BVUU7SUFFRixNQUFNLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUM7SUFDNUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQVEsRUFBRSxFQUFFO1FBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM3QixNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDNUcsTUFBTSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0lBQ2hELENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyJ9