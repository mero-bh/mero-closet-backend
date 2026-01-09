"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = void 0;
const POST = async (req, res) => {
    // multer middleware (src/api/middlewares.ts) adds req.file
    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: "file is required (multipart/form-data, field name: file)" });
    }
    const host = req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "http";
    res.json({
        name: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `${proto}://${host}/static/reels/${encodeURIComponent(file.filename)}`,
    });
};
exports.POST = POST;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL3JlZWxzL3VwbG9hZC9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFTyxNQUFNLElBQUksR0FBRyxLQUFLLEVBQUUsR0FBa0IsRUFBRSxHQUFtQixFQUFFLEVBQUU7SUFDcEUsMkRBQTJEO0lBQzNELE1BQU0sSUFBSSxHQUFJLEdBQVcsQ0FBQyxJQUFXLENBQUE7SUFFckMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1YsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwwREFBMEQsRUFBRSxDQUFDLENBQUE7SUFDdEcsQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFBO0lBQzdCLE1BQU0sS0FBSyxHQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQVksSUFBSSxNQUFNLENBQUE7SUFFcEUsR0FBRyxDQUFDLElBQUksQ0FBQztRQUNQLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUTtRQUNuQixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7UUFDL0IsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1FBQ3ZCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtRQUNmLEdBQUcsRUFBRSxHQUFHLEtBQUssTUFBTSxJQUFJLGlCQUFpQixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7S0FDNUUsQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUFBO0FBbEJZLFFBQUEsSUFBSSxRQWtCaEIifQ==