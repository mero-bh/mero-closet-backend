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

# IMPORTANT: Copy the locally built admin files
# This relies on 'npx medusa build' having been run locally before push
COPY .medusa .medusa

# We skip 'npx medusa build' here because we copied the artifacts
# RUN npx medusa build

# Expose the correct port
EXPOSE 9000

# Start the application
CMD ["npx", "medusa", "start"]
