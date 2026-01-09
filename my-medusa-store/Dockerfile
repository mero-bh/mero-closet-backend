FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

# Copy package management files
COPY package.json yarn.lock .yarnrc.yml* ./

# Install dependencies (must include devDependencies)
RUN yarn install --no-frozen-lockfile

# Define Build Arguments
ARG MEDUSA_BACKEND_URL=https://mero-admin.koyeb.app
ENV MEDUSA_BACKEND_URL=${MEDUSA_BACKEND_URL}
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy the rest of the application
COPY . .

# Run build - we use npx medusa build which builds both backend and admin in v2
RUN npx medusa build

# MANUALLY ENSURE THE ADMIN FILES ARE IN THE WEB SERVER PATH
# Medusa v2 expects it in .medusa/server/public/admin
RUN mkdir -p .medusa/server/public/admin && \
    ls -la .medusa/server/public/admin/index.html || (echo "Admin build missing, searching..." && find . -name index.html)

# Expose port
EXPOSE 9000

# Start script to check files before running
CMD ["sh", "-c", "ls -l .medusa/server/public/admin/index.html && npx medusa start"]
