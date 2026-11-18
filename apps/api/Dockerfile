FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build

FROM node:22-bookworm-slim AS runner

WORKDIR /workspace
ENV NODE_ENV=production
ENV PORT=4000

# Keep workspace symlinks resolvable in the runtime image.
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/apps/api ./apps/api
COPY --from=builder /workspace/packages ./packages
COPY --from=builder /workspace/services ./services

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
