# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Pass build args if needed for Next.js static optimization
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Next.js production server often needs more than just dist
# But for a simple deployment, we can use the full install or just the necessary parts.
# To keep it simple and working:
COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "run", "start"]
