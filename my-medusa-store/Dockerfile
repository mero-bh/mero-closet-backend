FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy Yarn configuration files (Yarn 4 needs these)
COPY .yarn ./.yarn
COPY .yarnrc.yml package.json yarn.lock ./

# Install dependencies
RUN yarn install --no-frozen-lockfile

# Increase memory for the build process
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy the rest of the application
COPY . .

# Build the application
# This will generate the backend and the admin dashboard
RUN npx medusa build

# Ensure the admin build is in the correct place
# For Medusa v2, it should be in .medusa/server/public/admin
RUN ls -la .medusa/server/public/admin/index.html

# Set PRODUCTION environment
ENV NODE_ENV=production

# Expose the correct port
EXPOSE 9000

# Start the application using medusa start
CMD ["npx", "medusa", "start"]
