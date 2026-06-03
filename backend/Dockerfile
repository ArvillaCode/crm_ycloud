# Base Stage
FROM node:18-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Development Stage
FROM node:18-alpine AS development
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Production Stage
FROM base AS production
EXPOSE 5000
CMD ["npm", "start"]
