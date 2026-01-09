import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const host = process.env.HOST || "0.0.0.0"
const port = Number(process.env.PORT || 9000)
const adminUrl = "https://mero-admin.koyeb.app"

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      // @ts-ignore
      host,
      // @ts-ignore
      port,
      storeCors: process.env.STORE_CORS || "http://localhost:8000,https://mero-closet.vercel.app,https://mero-closet-frontend-ui.vercel.app",
      adminCors: process.env.ADMIN_CORS || `http://localhost:5173,http://localhost:9000,${adminUrl}`,
      authCors: process.env.AUTH_CORS || `http://localhost:5173,http://localhost:9000,https://mero-closet.vercel.app,https://mero-closet-frontend-ui.vercel.app,${adminUrl}`,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: false,
    backendUrl: process.env.MEDUSA_BACKEND_URL || adminUrl,
  },
})
