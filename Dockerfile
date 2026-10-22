FROM node:22.23.4-alpine@sha256:ebc216c22db53dbde85719a874978d5aec04e6e405ad26a3804c6f9abc4ca1a9 AS base

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

FROM base AS deps

RUN apk add --no-cache libc6-compat
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

FROM base AS builder

RUN apk add --no-cache git

WORKDIR /app
COPY --from=deps /app/ .

ENV NODE_ENV=production
ARG BASE_URL

ENV BASE_URL=${BASE_URL}
ENV NEXT_PUBLIC_API_URL=${BASE_URL}/api/v3
ENV NEXT_PUBLIC_GATEWAY_URL=${BASE_URL}

RUN pnpm turbo run build --filter=@shiro/web

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install fonts for proper text rendering
RUN apk add --no-cache curl fontconfig unzip wget
RUN mkdir -p /usr/share/fonts/truetype/chinese /usr/share/fonts/truetype/english

# Install Chinese fonts
RUN wget -O /usr/share/fonts/truetype/LXGWWenKai-Regular.ttf \
  https://github.com/lxgw/LxgwWenKai/releases/download/v1.520/LXGWWenKai-Regular.ttf
RUN wget -O /usr/share/fonts/truetype/LXGWWenKai-Medium.ttf \
  https://github.com/lxgw/LxgwWenKai/releases/download/v1.520/LXGWWenKai-Medium.ttf
RUN wget -O /usr/share/fonts/truetype/LXGWWenKai-Light.ttf \
  https://github.com/lxgw/LxgwWenKai/releases/download/v1.520/LXGWWenKai-Light.ttf

# Install English font Geist
RUN wget -O /tmp/geist.zip \
  https://github.com/vercel/geist-font/releases/download/1.5.0/geist-font-1.5.0.zip
RUN unzip /tmp/geist.zip -d /tmp/geist
RUN find /tmp/geist -name "*.ttf" -exec cp {} /usr/share/fonts/truetype/ \;
RUN rm -rf /tmp/geist.zip /tmp/geist

# Update font cache
RUN fc-cache -fv

# and other docker env inject
# Next standalone (monorepo) outputs server at /app/apps/web/server.js
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/.next/server ./apps/web/.next/server

EXPOSE 2323

ENV PORT=2323
CMD ["sh", "-c", "echo 'Mix Space Web [Shiro] Image.' && node apps/web/server.js"]
