FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package management files
COPY package.json yarn.lock .yarnrc.yml* ./

# Install dependencies
RUN yarn install --no-frozen-lockfile

# Set environment variables for build and runtime
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy the rest of the application
COPY . .

# Build the application (In Medusa v2, this builds both the server and admin)
RUN npx medusa build

# Final check of the build output
RUN if [ ! -f .medusa/server/public/admin/index.html ]; then \
    echo "CRITICAL: Admin build failed - index.html not found!"; \
    exit 1; \
    fi

# Expose the correct port
EXPOSE 9000

# Start the server
CMD ["npx", "medusa", "start"]
