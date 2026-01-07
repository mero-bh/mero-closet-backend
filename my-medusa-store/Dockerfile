FROM node:20-slim

WORKDIR /app

# Copy package files first for caching
COPY package.json yarn.lock .yarnrc ./

# Install dependencies with loose lockfile checking
RUN yarn install --no-frozen-lockfile --network-timeout 100000

# Copy the rest of the application
COPY . .

# Set environment variables for build time
ENV NODE_ENV=production
ENV ADMIN_CORS=/^https:\/\/.*$/

# Build the application (backend + admin)
RUN yarn build

# Debug: Check if admin build exists
RUN ls -la .medusa/server/public/admin || echo "Admin build directory not found!"


# Start the application
CMD ["npx", "medusa", "start"]
