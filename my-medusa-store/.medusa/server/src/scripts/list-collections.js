"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listCollections;
const utils_1 = require("@medusajs/framework/utils");
const fs_1 = __importDefault(require("fs"));
async function listCollections({ container }) {
    const productModuleService = container.resolve(utils_1.Modules.PRODUCT);
    const categories = await productModuleService.listProductCategories({});
    const collections = await productModuleService.listProductCollections({});
    const data = {
        categories: categories.map((c) => ({ name: c.name, handle: c.handle, id: c.id })),
        collections: collections.map((c) => ({ title: c.title, handle: c.handle, id: c.id }))
    };
    fs_1.default.writeFileSync("C:/Users/code4/Desktop/medusa/backend-data.json", JSON.stringify(data, null, 2));
    console.log("Data written to backend-data.json");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdC1jb2xsZWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zY3JpcHRzL2xpc3QtY29sbGVjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFJQSxrQ0FhQztBQWhCRCxxREFBK0U7QUFDL0UsNENBQW9CO0FBRUwsS0FBSyxVQUFVLGVBQWUsQ0FBQyxFQUFFLFNBQVMsRUFBWTtJQUNqRSxNQUFNLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRWhFLE1BQU0sVUFBVSxHQUFHLE1BQU0sb0JBQW9CLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDeEUsTUFBTSxXQUFXLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUUxRSxNQUFNLElBQUksR0FBRztRQUNULFVBQVUsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RGLFdBQVcsRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQzdGLENBQUM7SUFFRixZQUFFLENBQUMsYUFBYSxDQUFDLGlEQUFpRCxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25HLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUNyRCxDQUFDIn0=