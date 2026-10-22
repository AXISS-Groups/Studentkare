# Canonical frontend image. Build context: repo root (e.g. docker build -f deploy/Dockerfile .).
# Build-time contract: ARG VITE_API_BASE_URL (default /api, proxied to backend:8000 via deploy/nginx.conf).
#                       ARG VITE_SENTRY_DSN (optional; empty = Sentry off, build still succeeds)
#                       ARG VITE_APP_VERSION (optional; the Sentry release, e.g. sha-<12>)
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .

ARG VITE_API_BASE_URL=/api
# Empty is fine: Sentry stays off (src/lib/sentry.ts) and the build does not fail.
ARG VITE_SENTRY_DSN=
ARG VITE_APP_VERSION=dev
# Public home page the logo links to; empty = the app's own landing route.
ARG VITE_PUBLIC_SITE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build

# nginx stable line, pinned (was the floating nginx:alpine).
FROM nginx:1.28-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Rendered to /etc/nginx/conf.d/default.conf at start by the image's envsubst
# step; BACKEND_UPSTREAM is the API address (Helm sets the backend Service).
COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
ENV BACKEND_UPSTREAM=backend:8000

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
