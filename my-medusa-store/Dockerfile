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

# Build the application (backend + admin)
RUN yarn build


# Start the application
CMD ["npx", "medusa", "start"]
