# Build & Development Stage
FROM node:18-alpine AS build-stage
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
# Keep this for development container execution
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Build for production
FROM build-stage AS production-build
RUN npm run build

# Nginx Production Stage
FROM nginx:stable-alpine AS production
COPY --from=production-build /usr/src/app/dist /usr/share/nginx/html
# Custom Nginx config to support client side routing (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
