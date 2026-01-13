"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = checkData;
const utils_1 = require("@medusajs/framework/utils");
async function checkData({ container }) {
    const productModuleStr = utils_1.Modules.PRODUCT;
    const productModule = container.resolve(productModuleStr);
    const [collections, countColl] = await productModule.listAndCountProductCollections();
    console.log(`COLLECTIONS: ${countColl}`);
    collections.forEach(c => console.log(` - ${c.title} (${c.handle})`));
    const [categories, countCat] = await productModule.listAndCountProductCategories();
    console.log(`CATEGORIES: ${countCat}`);
    categories.forEach(c => console.log(` - ${c.name} (${c.handle})`));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2stZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zY3JpcHRzL2NoZWNrLWRhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFJQSw0QkFXQztBQWJELHFEQUFtRDtBQUVwQyxLQUFLLFVBQVUsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFZO0lBQzNELE1BQU0sZ0JBQWdCLEdBQUcsZUFBTyxDQUFDLE9BQU8sQ0FBQTtJQUN4QyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFFekQsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsR0FBRyxNQUFNLGFBQWEsQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO0lBQ3JGLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLFNBQVMsRUFBRSxDQUFDLENBQUE7SUFDeEMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFFcEUsTUFBTSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsR0FBRyxNQUFNLGFBQWEsQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO0lBQ2xGLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQ3RDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQ3RFLENBQUMifQ==