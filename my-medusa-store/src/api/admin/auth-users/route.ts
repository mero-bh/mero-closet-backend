import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPgPool } from "../../../utils/pg"

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    // We use the raw connection from Medusa to query the auth_user table
    const query = `SELECT * FROM "auth_user" ORDER BY "createdAt" DESC`

    try {
        const pool = getPgPool()
        console.log("Admin API: Fetching auth users from auth_user table...")
        const result = await pool.query(query)

        res.json({
            users: result.rows,
            count: result.rowCount
        })
    } catch (error) {
        res.status(500).json({
            message: "Error fetching auth users",
            error: error.message
        })
    }
}

// DELETE action for users
export const DELETE = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const { id } = req.query

    if (!id) {
        return res.status(400).json({ message: "User ID is required" })
    }

    const getRoleQuery = `SELECT role FROM "auth_user" WHERE id = $1`
    const deleteQuery = `DELETE FROM "auth_user" WHERE id = $1`

    try {
        const pool = getPgPool()

        const roleResult = await pool.query(getRoleQuery, [id])
        const role = roleResult.rows?.[0]?.role
        if (role === "admin") {
            return res.status(403).json({ message: "Refusing to delete an admin user" })
        }

        await pool.query(deleteQuery, [id])

        res.json({
            message: "User deleted successfully"
        })
    } catch (error) {
        res.status(500).json({
            message: "Error deleting user",
            error: error.message
        })
    }
}
