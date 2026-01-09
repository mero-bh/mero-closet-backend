FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package management files
# We copy everything starting with .yarn (like .yarnrc.yml) if it exists, along with package.json and yarn.lock
COPY package.json yarn.lock .yarnrc.yml* ./

# Install dependencies (This will work fine with just yarn.lock)
RUN yarn install --no-frozen-lockfile

# Increase memory for the build process
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy the rest of the application
COPY . .

# Build the application
RUN npx medusa build

# Verify build
RUN ls -la .medusa/server/public/admin/index.html

# Set PRODUCTION environment
ENV NODE_ENV=production

# Expose the correct port
EXPOSE 9000

# Start the application
CMD ["npx", "medusa", "start"]
