FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build:css

FROM nginx:alpine
COPY --from=build /app/src/ /usr/share/nginx/html/
COPY imagens/ /usr/share/nginx/html/imagens/
