FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

# Copy package management files
COPY package.json yarn.lock .yarnrc.yml* ./

# Install dependencies
RUN yarn install --no-frozen-lockfile

# Set Build Environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV MEDUSA_ADMIN_ON_SERVE=true
ARG MEDUSA_BACKEND_URL=https://mero-admin.koyeb.app
ENV MEDUSA_BACKEND_URL=${MEDUSA_BACKEND_URL}

# Copy the rest of the application
COPY . .

# Build everything
RUN yarn build

# Ensure index.html exists in multiple locations to satisfy different Medusa resolution logics
RUN mkdir -p public/admin && \
    cp -r .medusa/server/public/admin/* public/admin/ || echo "Warning: Could not copy admin files to public/admin"

# Verify existence
RUN ls -la .medusa/server/public/admin/index.html && ls -la public/admin/index.html

# Expose port
EXPOSE 9000

# Start the server
CMD ["yarn", "start"]
