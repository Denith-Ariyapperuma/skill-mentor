# Production static hosting for Railway: bind 0.0.0.0:$PORT (avoids Railpack+Caddy edge mismatches).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite inlines these at build time — set the same names in Railway (mark available at build).
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_API_BASE_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g serve@14
COPY --from=build /app/dist ./dist
# Railway sets PORT; serve must listen on all interfaces, not localhost only.
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"]
