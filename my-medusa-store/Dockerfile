FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package management files
COPY package.json yarn.lock .yarnrc.yml* ./

# Install dependencies (including devDependencies for build)
RUN yarn install --no-frozen-lockfile

# Define Build Arguments
ARG MEDUSA_BACKEND_URL=https://mero-admin.koyeb.app
ENV MEDUSA_BACKEND_URL=${MEDUSA_BACKEND_URL}
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy the rest of the application
COPY . .

# Explicitly build the admin and the backend
RUN npx medusa build

# CRITICAL: Verify the admin build is exactly where Medusa expects it
# Default path for v2: .medusa/server/public/admin/index.html
RUN if [ ! -f .medusa/server/public/admin/index.html ]; then \
    echo "ERROR: Admin build was not generated! Check your medusa-config.ts and dependencies."; \
    ls -R .medusa || echo ".medusa folder not found"; \
    exit 1; \
    fi

# Set runtime environment
EXPOSE 9000

# Start the server
CMD ["npx", "medusa", "start"]
