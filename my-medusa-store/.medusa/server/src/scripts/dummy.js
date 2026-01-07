"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const utils_1 = require("@medusajs/framework/utils");
async function default_1({ container }) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    const remoteLink = container.resolve(utils_1.ContainerRegistrationKeys.REMOTE_LINK);
    // Checking for existing keys not easily doable without a specific service, 
    // so we will just try to create one or print instructions.
    // Actually, let's just print a message because creating requires more setup 
    // and we might duplicate keys.
    // A better approach for V2 might be using the API Key service if exposed, 
    // but for now, let's just guide the user to wait for Admin or use the API.
    console.log("To get your Publishable Key:");
    console.log("1. Wait for Admin panel to be fixed (we will do that next).");
    console.log("2. OR, login to your DB and check the 'api_key' table.");
    // Let's try to query via Remote Link if possible?
    // No, getting direct DB access is easier for me.
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHVtbXkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvc2NyaXB0cy9kdW1teS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU1BLDRCQWtCQztBQXBCRCxxREFBcUU7QUFFdEQsS0FBSyxvQkFBVyxFQUFFLFNBQVMsRUFBWTtJQUNsRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xFLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsV0FBVyxDQUFDLENBQUE7SUFFM0UsNEVBQTRFO0lBQzVFLDJEQUEyRDtJQUMzRCw2RUFBNkU7SUFDN0UsK0JBQStCO0lBRS9CLDJFQUEyRTtJQUMzRSwyRUFBMkU7SUFFM0UsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO0lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkRBQTZELENBQUMsQ0FBQTtJQUMxRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdEQUF3RCxDQUFDLENBQUE7SUFFckUsa0RBQWtEO0lBQ2xELGlEQUFpRDtBQUNyRCxDQUFDIn0=