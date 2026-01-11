import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const adminUrl = "https://mero-admin.koyeb.app"

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000,https://mero-closet.vercel.app,https://mero-closet-frontend-ui.vercel.app",
      adminCors: process.env.ADMIN_CORS || `http://localhost:5173,http://localhost:9000,${adminUrl}`,
      authCors: process.env.AUTH_CORS || `http://localhost:5173,http://localhost:9000,https://mero-closet.vercel.app,https://mero-closet-frontend-ui.vercel.app,${adminUrl}`,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: false,
    path: "/app",
    backendUrl: process.env.MEDUSA_BACKEND_URL || adminUrl,
  },
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "medusa-payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
  ],
})
