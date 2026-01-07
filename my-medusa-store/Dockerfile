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

# Build the application (backend + admin) explicitly using npx
# Force admin build by setting env var if needed, though config handles it
RUN npx medusa build

# Debug: List all files in .medusa to see where things are (for logs)
RUN echo "Listing .medusa directory structure:" && ls -R .medusa || echo ".medusa directory not found"

# Start the application
CMD ["npx", "medusa", "start"]
