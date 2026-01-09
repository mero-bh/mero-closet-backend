"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const reelsDir = path_1.default.join(process.cwd(), "static", "reels");
function publicUrl(req, fileName) {
    const host = req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "http";
    // Medusa serves /static ... so we return an absolute URL for convenience.
    return `${proto}://${host}/static/reels/${encodeURIComponent(fileName)}`;
}
const GET = async (req, res) => {
    try {
        fs_1.default.mkdirSync(reelsDir, { recursive: true });
        const files = fs_1.default
            .readdirSync(reelsDir)
            .filter((f) => !f.startsWith("."))
            .map((name) => {
            const full = path_1.default.join(reelsDir, name);
            const stat = fs_1.default.statSync(full);
            const ext = path_1.default.extname(name).toLowerCase();
            const type = [".mp4", ".webm", ".mov"].includes(ext) ? "video" : "image";
            return {
                name,
                type,
                size: stat.size,
                createdAt: stat.birthtime?.toISOString?.() || stat.ctime.toISOString(),
                url: publicUrl(req, name),
            };
        })
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        res.json({ items: files, count: files.length });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to list reels", error: error?.message });
    }
};
exports.GET = GET;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL3JlZWxzL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLDRDQUFtQjtBQUNuQixnREFBdUI7QUFFdkIsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0FBRTVELFNBQVMsU0FBUyxDQUFDLEdBQWtCLEVBQUUsUUFBZ0I7SUFDckQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUE7SUFDN0IsTUFBTSxLQUFLLEdBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBWSxJQUFJLE1BQU0sQ0FBQTtJQUNwRSwwRUFBMEU7SUFDMUUsT0FBTyxHQUFHLEtBQUssTUFBTSxJQUFJLGlCQUFpQixrQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFBO0FBQzFFLENBQUM7QUFFTSxNQUFNLEdBQUcsR0FBRyxLQUFLLEVBQUUsR0FBa0IsRUFBRSxHQUFtQixFQUFFLEVBQUU7SUFDbkUsSUFBSSxDQUFDO1FBQ0gsWUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLEtBQUssR0FBRyxZQUFFO2FBQ2IsV0FBVyxDQUFDLFFBQVEsQ0FBQzthQUNyQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNqQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNaLE1BQU0sSUFBSSxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLFlBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDOUIsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUM1QyxNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtZQUN4RSxPQUFPO2dCQUNMLElBQUk7Z0JBQ0osSUFBSTtnQkFDSixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRTtnQkFDdEUsR0FBRyxFQUFFLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2FBQzFCLENBQUE7UUFDSCxDQUFDLENBQUM7YUFDRCxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFdkQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUNsRixDQUFDO0FBQ0gsQ0FBQyxDQUFBO0FBekJZLFFBQUEsR0FBRyxPQXlCZiJ9