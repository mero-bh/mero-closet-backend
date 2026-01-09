"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = exports.GET = void 0;
const pg_1 = require("../../../utils/pg");
const GET = async (req, res) => {
    // We use the raw connection from Medusa to query the auth_user table
    const query = `SELECT * FROM "auth_user" ORDER BY "createdAt" DESC`;
    try {
        const pool = (0, pg_1.getPgPool)();
        console.log("Admin API: Fetching auth users from auth_user table...");
        const result = await pool.query(query);
        res.json({
            users: result.rows,
            count: result.rowCount
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Error fetching auth users",
            error: error.message
        });
    }
};
exports.GET = GET;
// DELETE action for users
const DELETE = async (req, res) => {
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ message: "User ID is required" });
    }
    const getRoleQuery = `SELECT role FROM "auth_user" WHERE id = $1`;
    const deleteQuery = `DELETE FROM "auth_user" WHERE id = $1`;
    try {
        const pool = (0, pg_1.getPgPool)();
        const roleResult = await pool.query(getRoleQuery, [id]);
        const role = roleResult.rows?.[0]?.role;
        if (role === "admin") {
            return res.status(403).json({ message: "Refusing to delete an admin user" });
        }
        await pool.query(deleteQuery, [id]);
        res.json({
            message: "User deleted successfully"
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Error deleting user",
            error: error.message
        });
    }
};
exports.DELETE = DELETE;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2F1dGgtdXNlcnMvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMENBQTZDO0FBRXRDLE1BQU0sR0FBRyxHQUFHLEtBQUssRUFDcEIsR0FBa0IsRUFDbEIsR0FBbUIsRUFDckIsRUFBRTtJQUNBLHFFQUFxRTtJQUNyRSxNQUFNLEtBQUssR0FBRyxxREFBcUQsQ0FBQTtJQUVuRSxJQUFJLENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyxJQUFBLGNBQVMsR0FBRSxDQUFBO1FBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0RBQXdELENBQUMsQ0FBQTtRQUNyRSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFdEMsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNMLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSTtZQUNsQixLQUFLLEVBQUUsTUFBTSxDQUFDLFFBQVE7U0FDekIsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDYixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNqQixPQUFPLEVBQUUsMkJBQTJCO1lBQ3BDLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTztTQUN2QixDQUFDLENBQUE7SUFDTixDQUFDO0FBQ0wsQ0FBQyxDQUFBO0FBdEJZLFFBQUEsR0FBRyxPQXNCZjtBQUVELDBCQUEwQjtBQUNuQixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQ3ZCLEdBQWtCLEVBQ2xCLEdBQW1CLEVBQ3JCLEVBQUU7SUFDQSxNQUFNLEVBQUUsRUFBRSxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQTtJQUV4QixJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDTixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsTUFBTSxZQUFZLEdBQUcsNENBQTRDLENBQUE7SUFDakUsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLENBQUE7SUFFM0QsSUFBSSxDQUFDO1FBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBQSxjQUFTLEdBQUUsQ0FBQTtRQUV4QixNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2RCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFBO1FBQ3ZDLElBQUksSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hGLENBQUM7UUFFRCxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVuQyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ0wsT0FBTyxFQUFFLDJCQUEyQjtTQUN2QyxDQUFDLENBQUE7SUFDTixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNiLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ2pCLE9BQU8sRUFBRSxxQkFBcUI7WUFDOUIsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPO1NBQ3ZCLENBQUMsQ0FBQTtJQUNOLENBQUM7QUFDTCxDQUFDLENBQUE7QUFqQ1ksUUFBQSxNQUFNLFVBaUNsQiJ9