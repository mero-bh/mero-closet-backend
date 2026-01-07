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

# Build inside the container so .medusa/server/public/admin/index.html exists on Koyeb
RUN yarn build

# Expose the correct port
EXPOSE 9000

# Run migrations then start (production)
CMD ["sh", "-lc", "npx medusa db:migrate && npx medusa start"]
