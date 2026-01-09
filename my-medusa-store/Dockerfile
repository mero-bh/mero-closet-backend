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
RUN yarn build

# In Medusa v2, the admin build is typically located in .medusa/server/public/admin
# Let's verify and ensure it exists where the server expects it
RUN ls -la .medusa/server/public/admin/index.html || (echo "Admin build files not found in .medusa/server/public/admin" && exit 1)

# Expose the correct port
EXPOSE 9000

# Start the application
CMD ["npx", "medusa", "start"]
