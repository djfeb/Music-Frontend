# Multi-stage build for Next.js application
FROM node:20-alpine AS base

# -----------------------
# Dependencies
# -----------------------
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --force

# -----------------------
# Builder
# -----------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

