"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getPubKey;
const utils_1 = require("@medusajs/framework/utils");
async function getPubKey({ container }) {
    const apiKeyService = container.resolve(utils_1.Modules.API_KEY);
    const keys = await apiKeyService.listApiKeys({ title: "Webshop" });
    if (keys.length > 0) {
        console.log(`KEY_FOUND: ${keys[0].token}`);
    }
    else {
        console.log("KEY_NOT_FOUND");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWtleS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zY3JpcHRzL2dldC1rZXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFHQSw0QkFRQztBQVZELHFEQUFtRDtBQUVwQyxLQUFLLFVBQVUsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFZO0lBQzNELE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3hELE1BQU0sSUFBSSxHQUFHLE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO0lBQ2xFLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDOUMsQ0FBQztTQUFNLENBQUM7UUFDSixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2hDLENBQUM7QUFDTCxDQUFDIn0=