FROM node:20-slim

WORKDIR /app

# Install system dependencies (Python/Build tools often needed for native modules)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files first for caching
COPY package.json yarn.lock .yarnrc ./

# Install all dependencies (including devDependencies for the build step)
RUN yarn install --no-frozen-lockfile --network-timeout 100000

# Increase memory limit for build and runtime (Crucial for Koyeb)
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy the rest of the application
COPY . .

# Build the application
# We use --admin-only if needed, but 'medusa build' should cover it.
RUN yarn build

# Ensure the admin build is in the correct location for Medusa v2
# Medusa v2 usually looks in .medusa/admin, but some setups use different paths.
# This ensures it's available where the server expects it.
RUN ls -la .medusa/admin/index.html || (echo "Admin build failed to produce index.html" && exit 1)

# Expose the correct port
EXPOSE 9000

# Start the application
CMD ["npx", "medusa", "start"]
