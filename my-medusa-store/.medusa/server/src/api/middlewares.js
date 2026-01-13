"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("@medusajs/framework/http");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Reels upload (video/images) middleware.
 * Enables multipart/form-data handling for both:
 *   - /admin/reels/upload (Medusa Admin)
 *   - /store/reels/upload (Frontend)
 */
const reelsDir = path_1.default.join(process.cwd(), "static", "reels");
fs_1.default.mkdirSync(reelsDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, reelsDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname || "");
        const base = path_1.default
            .basename(file.originalname || "file", ext)
            .replace(/[^a-zA-Z0-9-_]/g, "_")
            .slice(0, 60);
        cb(null, `${Date.now()}-${base}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 150 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/webm",
            "video/quicktime",
        ];
        if (allowed.includes(file.mimetype))
            return cb(null, true);
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
    },
});
exports.default = (0, http_1.defineMiddlewares)({
    routes: [
        {
            matcher: "/admin/reels/upload",
            middlewares: [upload.single("file")],
        },
        {
            matcher: "/store/reels/upload",
            middlewares: [upload.single("file")],
        },
    ],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvYXBpL21pZGRsZXdhcmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsbURBQTREO0FBQzVELG9EQUEyQjtBQUMzQiw0Q0FBbUI7QUFDbkIsZ0RBQXVCO0FBRXZCOzs7OztHQUtHO0FBQ0gsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0FBQzVELFlBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7QUFFM0MsTUFBTSxPQUFPLEdBQUcsZ0JBQU0sQ0FBQyxXQUFXLENBQUM7SUFDakMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO0lBQ3BELFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUU7UUFDM0IsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sSUFBSSxHQUFHLGNBQUk7YUFDZCxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxNQUFNLEVBQUUsR0FBRyxDQUFDO2FBQzFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7YUFDL0IsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNmLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUE7SUFDekMsQ0FBQztDQUNGLENBQUMsQ0FBQTtBQUVGLE1BQU0sTUFBTSxHQUFHLElBQUEsZ0JBQU0sRUFBQztJQUNwQixPQUFPO0lBQ1AsTUFBTSxFQUFFO1FBQ04sUUFBUSxFQUFFLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSTtLQUM1QjtJQUNELFVBQVUsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUU7UUFDN0IsTUFBTSxPQUFPLEdBQUc7WUFDZCxZQUFZO1lBQ1osV0FBVztZQUNYLFlBQVk7WUFDWixXQUFXO1lBQ1gsV0FBVztZQUNYLFlBQVk7WUFDWixpQkFBaUI7U0FDbEIsQ0FBQTtRQUNELElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQUUsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFELEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQywwQkFBMEIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0NBQ0YsQ0FBQyxDQUFBO0FBRUYsa0JBQWUsSUFBQSx3QkFBaUIsRUFBQztJQUMvQixNQUFNLEVBQUU7UUFDTjtZQUNFLE9BQU8sRUFBRSxxQkFBcUI7WUFDOUIsV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQVEsQ0FBQztTQUM1QztRQUNEO1lBQ0UsT0FBTyxFQUFFLHFCQUFxQjtZQUM5QixXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBUSxDQUFDO1NBQzVDO0tBQ0Y7Q0FDRixDQUFDLENBQUEifQ==