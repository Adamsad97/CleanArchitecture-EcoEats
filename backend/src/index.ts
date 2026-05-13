import { env } from "./infrastructure/config/env.js";
import { prisma } from "./infrastructure/databases/prismaClient.js";

// ── Infrastructure partagée ───────────────────────────────────────────────────
import { PrismaUserRepository } from "./infrastructure/repositories/PrismaUserRepository.js";
import { PrismaRefreshTokenRepository } from "./infrastructure/repositories/PrismaRefreshTokenRepository.js";
import { JwtTokenService } from "./infrastructure/security/JwtTokenService.js";
import { BcryptPasswordHasher } from "./infrastructure/security/BcryptPasswordHasher.js";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { SocketIOGateway } from "./infrastructure/frameworks/websocket/SocketIOGateway.js";
import { setupNotificationAdapter } from "./interfaces/adapters/websocket/notificationAdapter.js";
import type { INotificationGateway } from "./application/ports/INotificationGateway.js";
import { ConfigService } from "./infrastructure/config/ConfigService.js";
import { RedisCacheService } from "./infrastructure/services/RedisCacheService.js";
import { PrismaEventStore } from "./infrastructure/repositories/PrismaEventStore.js";
import { MetricsService } from "./infrastructure/monitoring/MetricsService.js";

// ── Modules métier ────────────────────────────────────────────────────────────
import { buildAuthModule } from "./modules/auth.module.js";
import { buildPaymentModule } from "./modules/payment.module.js";
import { buildRestaurantModule } from "./modules/restaurant.module.js";
import { buildMenuModule } from "./modules/menu.module.js";
import { buildOrderModule } from "./modules/order.module.js";
import { buildDriverModule } from "./modules/driver.module.js";
import { buildAdminModule } from "./modules/admin.module.js";

// ── Frameworks ────────────────────────────────────────────────────────────────
import { createExpressApp } from "./infrastructure/frameworks/express/index.js";
import { createFastifyApp } from "./infrastructure/frameworks/fastify/index.js";

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const userRepository         = new PrismaUserRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const jwtTokenService        = new JwtTokenService(env);
const bcryptPasswordHasher   = new BcryptPasswordHasher();
const configService          = new ConfigService(env);
const cacheService           = new RedisCacheService(configService);
const eventStore             = new PrismaEventStore(prisma);
const metricsService         = new MetricsService();

/* Proxy lazy : le gateway réel (Socket.IO) est injecté après démarrage du serveur HTTP. */
let resolvedGateway: SocketIOGateway | null = null;
const notificationGateway: INotificationGateway = {
  notifyUser:      (userId, payload) => resolvedGateway?.notifyUser(userId, payload),
  broadcastToRoom: (room, event, data) => resolvedGateway?.broadcastToRoom(room, event, data),
};

/* ── Assemblage des modules (chacun gère ses propres dépendances) ── */
const auth        = buildAuthModule({ userRepository, refreshTokenRepository, jwtTokenService, bcryptPasswordHasher });
const payment     = buildPaymentModule({ prisma, env });
const restaurant  = buildRestaurantModule({ prisma });
const menu        = buildMenuModule({ prisma, cacheService });
const order       = buildOrderModule({ prisma, restaurantModule: restaurant, menuModule: menu, notificationGateway, paymentMethodRepository: payment.paymentMethodRepository, eventStore });
const driver      = buildDriverModule({ prisma, orderModule: order, notificationGateway });
const admin       = buildAdminModule({ prisma });

/* Nettoyage quotidien des refresh tokens expirés */
setInterval(async () => {
  const count = await auth.pruneExpiredRefreshTokensUseCase.execute();
  if (count > 0) console.log(`[cleanup]: ${count} refresh tokens expirés supprimés`);
}, 24 * 60 * 60 * 1000);

const startServer = async () => {
  if (env.httpFramework === "fastify") {
    const fastifyApp = createFastifyApp({
      userRepo:                    userRepository,
      refreshTokenRepo:            refreshTokenRepository,
      tokenService:                jwtTokenService,
      passwordHasher:              bcryptPasswordHasher,
      getPendingDocumentsUseCase:  admin.getPendingDocumentsUseCase,
      updateDocumentStatusUseCase: admin.updateDocumentStatusUseCase,
      corsOrigin:                  env.corsOrigins,
    });
    await fastifyApp.listen({ port: Number(env.port), host: "0.0.0.0" });
    console.log(`[fastify]: http://localhost:${env.port}`);
    return;
  }

  const expressApp = createExpressApp({
    /* ── Auth ── */
    userRepository,
    refreshTokenRepository,
    tokenService:                         jwtTokenService,
    passwordHasher:                       bcryptPasswordHasher,
    requireAuthentication:                auth.requireAuthentication,
    /* ── Payment ── */
    paymentGateway:                       payment.stripePaymentGateway,
    paymentMethodRepository:              payment.paymentMethodRepository,
    createPaymentIntentUseCase:           payment.createPaymentIntentUseCase,
    createSetupIntentUseCase:             payment.createSetupIntentUseCase,
    getSavedPaymentMethodsUseCase:        payment.getSavedPaymentMethodsUseCase,
    confirmPaymentMethodUseCase:          payment.confirmPaymentMethodUseCase,
    removePaymentMethodUseCase:           payment.removePaymentMethodUseCase,
    /* ── Restaurants ── */
    restaurantRepository:                 restaurant.restaurantRepository,
    getOwnerRestaurantsUseCase:           restaurant.getOwnerRestaurantsUseCase,
    createRestaurantUseCase:              restaurant.createRestaurantUseCase,
    updateRestaurantProfileUseCase:       restaurant.updateRestaurantProfileUseCase,
    updateOpeningHoursUseCase:            restaurant.updateOpeningHoursUseCase,
    toggleRestaurantStatusUseCase:        restaurant.toggleRestaurantStatusUseCase,
    /* ── Menu ── */
    menuCategoryRepository:               menu.menuCategoryRepository,
    menuItemRepository:                   menu.menuItemRepository,
    getRestaurantMenuUseCase:             menu.getRestaurantMenuUseCase,
    createMenuCategoryUseCase:            menu.createMenuCategoryUseCase,
    updateMenuCategoryUseCase:            menu.updateMenuCategoryUseCase,
    deleteMenuCategoryUseCase:            menu.deleteMenuCategoryUseCase,
    createMenuItemUseCase:                menu.createMenuItemUseCase,
    updateMenuItemUseCase:                menu.updateMenuItemUseCase,
    deleteMenuItemUseCase:                menu.deleteMenuItemUseCase,
    toggleMenuItemAvailabilityUseCase:    menu.toggleMenuItemAvailabilityUseCase,
    updateMenuItemStockUseCase:           menu.updateMenuItemStockUseCase,
    createMenuItemOptionUseCase:          menu.createMenuItemOptionUseCase,
    exportMenuCsvUseCase:                 menu.exportMenuCsvUseCase,
    importMenuCsvUseCase:                 menu.importMenuCsvUseCase,
    /* ── Orders ── */
    createOrderUseCase:                   order.createOrderUseCase,
    getUserOrdersUseCase:                 order.getUserOrdersUseCase,
    getRestaurantOrdersUseCase:           order.getRestaurantOrdersUseCase,
    updateOrderStatusUseCase:             order.updateOrderStatusUseCase,
    getOrderInvoiceUseCase:               order.getOrderInvoiceUseCase,
    /* ── Drivers ── */
    toggleDriverStatusUseCase:            driver.toggleDriverStatusUseCase,
    getAvailableDeliveriesUseCase:        driver.getAvailableDeliveriesUseCase,
    acceptDeliveryUseCase:                driver.acceptDeliveryUseCase,
    createDriverProfileUseCase:           driver.createDriverProfileUseCase,
    getDriverProfileUseCase:              driver.getDriverProfileUseCase,
    getActiveDeliveryUseCase:             driver.getActiveDeliveryUseCase,
    pickupDeliveryUseCase:                driver.pickupDeliveryUseCase,
    completeDeliveryUseCase:              driver.completeDeliveryUseCase,
    getDriverWalletUseCase:               driver.getDriverWalletUseCase,
    /* ── Admin & Documents ── */
    documentRepository:                   admin.documentRepository,
    getPendingDocumentsUseCase:           admin.getPendingDocumentsUseCase,
    getDocumentsByStatusUseCase:          admin.getDocumentsByStatusUseCase,
    updateDocumentStatusUseCase:          admin.updateDocumentStatusUseCase,
    getAdminStatsUseCase:                 admin.getAdminStatsUseCase,
    /* ── Shared ── */
    notificationGateway,
    metricsService,
    corsOrigin:                           env.corsOrigins,
  });

  const httpServer     = createServer(expressApp);
  const socketIOServer = new SocketIOServer(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN ?? "http://localhost:3000", credentials: true },
  });

  resolvedGateway = new SocketIOGateway(socketIOServer);
  setupNotificationAdapter(socketIOServer, jwtTokenService, userRepository);

  httpServer.listen(env.port, () => {
    console.log(`[express]:   http://localhost:${env.port}`);
    console.log(`[socket.io]: ws://localhost:${env.port}`);
  });
};

startServer().catch((error) => {
  console.error("[bootstrap-error]:", error);
  process.exit(1);
});