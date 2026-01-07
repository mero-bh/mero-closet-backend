FROM node:20-slim

WORKDIR /app

# Install system dependencies (Python/Build tools often needed for native modules)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files first for caching
COPY package.json yarn.lock .yarnrc ./

# Install all dependencies (including devDependencies for the build step)
RUN yarn install --no-frozen-lockfile --network-timeout 100000

# Copy the rest of the application
COPY . .

# Copy the locally built artifacts (Admin + Server)
COPY .medusa .medusa

# DEBUG: List files to verify they are copied correctly
RUN ls -R .medusa/server/public/admin || echo "Admin folder not found!"

# Build step skipped (artifacts are copied)
# RUN yarn build

# Limit Node memory to fit within 512MB instance (leaving ~50MB for OS overhead)
ENV NODE_OPTIONS="--max-old-space-size=460"

# Expose the correct port
EXPOSE 9000

# Start the application directly (migrations assumed done manually or previously)
# This saves memory and startup time on Free Tier
CMD ["npx", "medusa", "start"]
