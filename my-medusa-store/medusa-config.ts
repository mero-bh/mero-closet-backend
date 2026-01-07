const port = Number(process.env.PORT || 9000)
const host = process.env.HOST || "0.0.0.0"

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      host,
      port,
      storeCors:
        process.env.STORE_CORS ||
        "http://localhost:8000,https://mero-closet.vercel.app,https://mero-closet-frontend-ui.vercel.app",
      adminCors:
        process.env.ADMIN_CORS ||
        "http://localhost:5173,http://localhost:9000,https://essential-clarey-merocloset-8214c1dd.koyeb.app",
      authCors:
        process.env.AUTH_CORS ||
        "http://localhost:5173,http://localhost:9000,https://mero-closet.vercel.app,https://mero-closet-frontend-ui.vercel.app,https://essential-clarey-merocloset-8214c1dd.koyeb.app",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: false,
  },
})
