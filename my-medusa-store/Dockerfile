FROM node:20-slim

WORKDIR /app

# Copy package files first for caching
COPY package.json yarn.lock .yarnrc ./

# Install dependencies with loose lockfile checking
RUN yarn install --no-frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN yarn build

# Start the application
CMD ["npx", "medusa", "start"]
