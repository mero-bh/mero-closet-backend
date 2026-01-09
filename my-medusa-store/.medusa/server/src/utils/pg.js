"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPgPool = getPgPool;
const pg_1 = require("pg");
let pool = null;
/**
 * Simple singleton PG pool.
 * We keep it here because some custom routes (auth_user tables) are outside Medusa modules.
 */
function getPgPool() {
    if (pool)
        return pool;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is missing in backend environment");
    }
    pool = new pg_1.Pool({ connectionString });
    return pool;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvdXRpbHMvcGcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFRQSw4QkFVQztBQWxCRCwyQkFBeUI7QUFFekIsSUFBSSxJQUFJLEdBQWdCLElBQUksQ0FBQTtBQUU1Qjs7O0dBR0c7QUFDSCxTQUFnQixTQUFTO0lBQ3ZCLElBQUksSUFBSTtRQUFFLE9BQU8sSUFBSSxDQUFBO0lBRXJCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUE7SUFDakQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxJQUFJLEdBQUcsSUFBSSxTQUFJLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7SUFDckMsT0FBTyxJQUFJLENBQUE7QUFDYixDQUFDIn0=