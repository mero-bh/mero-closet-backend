import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    // We use the raw connection from Medusa to query the auth_user table
    const query = `SELECT * FROM "auth_user" ORDER BY "createdAt" DESC`

    try {
        const dbConnection = req.scope.resolve("pg_connection") as any
        console.log("Admin API: Fetching auth users from auth_user table...")
        const result = await dbConnection.query(query)

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

    const query = `DELETE FROM "auth_user" WHERE id = $1`

    try {
        const dbConnection = req.scope.resolve("pg_connection") as any
        await dbConnection.query(query, [id])

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
