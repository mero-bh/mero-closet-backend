FROM node:20-slim

WORKDIR /app

# Install system dependencies (Python/Build tools often needed for native modules)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files first for caching
COPY package.json yarn.lock .yarnrc ./

# Install all dependencies (including devDependencies for the build step)
# Using --network-timeout to prevent slow connection issues
RUN yarn install --no-frozen-lockfile --network-timeout 100000

# Copy the rest of the application
COPY . .

# Increase memory limit for the build process to avoid crashes on limited instances
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Run the build
RUN npx medusa build

# Expose the correct port
EXPOSE 9000

# Start the application
CMD ["npx", "medusa", "start"]
