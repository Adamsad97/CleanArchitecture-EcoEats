import { env } from "./infrastructure/config/env.js";
import { prisma } from "./infrastructure/databases/prismaClient.js";
import { createExpressApp } from "./infrastructure/frameworks/express/index.js";
import { createFastifyApp } from "./infrastructure/frameworks/fastify/index.js";
import { PrismaUserRepository } from "./infrastructure/repositories/PrismaUserRepository.js";
import { PrismaRefreshTokenRepository } from "./infrastructure/repositories/PrismaRefreshTokenRepository.js";
import { JwtTokenService } from "./infrastructure/security/JwtTokenService.js";
import { BcryptPasswordHasher } from "./infrastructure/security/BcryptPasswordHasher.js";
import { GetCurrentUserUseCase } from "./application/usecases/auth/GetCurrentUserUseCase.js";
import { PruneExpiredRefreshTokensUseCase } from "./application/usecases/auth/PruneExpiredRefreshTokensUseCase.js";
import { createRequireAuth } from "./interfaces/middlewares/requireAuth.js";
import { PrismaDocumentRepository } from "./infrastructure/repositories/PrismaDocumentRepository.js";
import { StripePaymentGateway } from "./infrastructure/payment/StripePaymentGateway.js";
import { PrismaPaymentMethodRepository } from "./infrastructure/repositories/PrismaPaymentMethodRepository.js";
import { CreatePaymentIntentUseCase } from "./application/usecases/payment/CreatePaymentIntentUseCase.js";
import { CreateSetupIntentUseCase } from "./application/usecases/payment/CreateSetupIntentUseCase.js";
import { GetSavedPaymentMethodsUseCase } from "./application/usecases/payment/GetSavedPaymentMethodsUseCase.js";
import { ConfirmPaymentMethodUseCase } from "./application/usecases/payment/ConfirmPaymentMethodUseCase.js";
import { RemovePaymentMethodUseCase } from "./application/usecases/payment/RemovePaymentMethodUseCase.js";
import { PrismaRestaurantRepository } from "./infrastructure/repositories/PrismaRestaurantRepository.js";
import { GetOwnerRestaurantsUseCase } from "./application/usecases/restaurant/GetOwnerRestaurantsUseCase.js";
import { CreateRestaurantUseCase } from "./application/usecases/restaurant/CreateRestaurantUseCase.js";
import { UpdateRestaurantProfileUseCase } from "./application/usecases/restaurant/UpdateRestaurantProfileUseCase.js";
import { UpdateOpeningHoursUseCase } from "./application/usecases/restaurant/UpdateOpeningHoursUseCase.js";
import { ToggleRestaurantStatusUseCase } from "./application/usecases/restaurant/ToggleRestaurantStatusUseCase.js";
import { GetPendingDocumentsUseCase } from "./application/usecases/document/GetPendingDocumentsUseCase.js";
import { GetDocumentsByStatusUseCase } from "./application/usecases/document/GetDocumentsByStatusUseCase.js";
import { UpdateDocumentStatusUseCase } from "./application/usecases/document/UpdateDocumentStatusUseCase.js";
import { GetAdminStatsUseCase } from "./application/usecases/admin/GetAdminStatsUseCase.js";
import { PrismaOrderRepository } from "./infrastructure/repositories/PrismaOrderRepository.js";
import { CreateOrderUseCase } from "./application/usecases/order/CreateOrderUseCase.js";
import { GetUserOrdersUseCase } from "./application/usecases/order/GetUserOrdersUseCase.js";
import { GetRestaurantOrdersUseCase } from "./application/usecases/order/GetRestaurantOrdersUseCase.js";
import { UpdateOrderStatusUseCase } from "./application/usecases/order/UpdateOrderStatusUseCase.js";
import { PrismaDriverRepository } from "./infrastructure/repositories/PrismaDriverRepository.js";
import { ToggleDriverStatusUseCase } from "./application/usecases/driver/ToggleDriverStatusUseCase.js";
import { GetAvailableDeliveriesUseCase } from "./application/usecases/driver/GetAvailableDeliveriesUseCase.js";
import { AcceptDeliveryUseCase } from "./application/usecases/driver/AcceptDeliveryUseCase.js";
import { CreateDriverProfileUseCase } from "./application/usecases/driver/CreateDriverProfileUseCase.js";
import { GetDriverProfileUseCase } from "./application/usecases/driver/GetDriverProfileUseCase.js";
import { GetActiveDeliveryUseCase } from "./application/usecases/driver/GetActiveDeliveryUseCase.js";
import { PickupDeliveryUseCase } from "./application/usecases/driver/PickupDeliveryUseCase.js";
import { CompleteDeliveryUseCase } from "./application/usecases/driver/CompleteDeliveryUseCase.js";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { SocketIOGateway } from "./infrastructure/frameworks/websocket/SocketIOGateway.js";
import { setupNotificationAdapter } from "./interfaces/adapters/websocket/notificationAdapter.js";
import { PrismaMenuCategoryRepository } from "./infrastructure/repositories/PrismaMenuCategoryRepository.js";
import { PrismaMenuItemRepository } from "./infrastructure/repositories/PrismaMenuItemRepository.js";
import { GetRestaurantMenuUseCase } from "./application/usecases/menu/GetRestaurantMenuUseCase.js";
import { CreateMenuCategoryUseCase } from "./application/usecases/menu/CreateMenuCategoryUseCase.js";
import { UpdateMenuCategoryUseCase } from "./application/usecases/menu/UpdateMenuCategoryUseCase.js";
import { DeleteMenuCategoryUseCase } from "./application/usecases/menu/DeleteMenuCategoryUseCase.js";
import { CreateMenuItemUseCase } from "./application/usecases/menu/CreateMenuItemUseCase.js";
import { UpdateMenuItemUseCase } from "./application/usecases/menu/UpdateMenuItemUseCase.js";
import { DeleteMenuItemUseCase } from "./application/usecases/menu/DeleteMenuItemUseCase.js";
import { ToggleMenuItemAvailabilityUseCase } from "./application/usecases/menu/ToggleMenuItemAvailabilityUseCase.js";
import { UpdateMenuItemStockUseCase } from "./application/usecases/menu/UpdateMenuItemStockUseCase.js";
import { CreateMenuItemOptionUseCase } from "./application/usecases/menu/CreateMenuItemOptionUseCase.js";
import { ExportMenuCsvUseCase } from "./application/usecases/menu/ExportMenuCsvUseCase.js";
import { ImportMenuCsvUseCase } from "./application/usecases/menu/ImportMenuCsvUseCase.js";

// ── Composition root ──────────────────────────────────────────────────────────
const userRepository = new PrismaUserRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const jwtTokenService = new JwtTokenService(env);
const bcryptPasswordHasher = new BcryptPasswordHasher();

const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository, jwtTokenService);
const pruneExpiredRefreshTokensUseCase = new PruneExpiredRefreshTokensUseCase(refreshTokenRepository);
const requireAuthentication = createRequireAuth(getCurrentUserUseCase);
const documentRepository = new PrismaDocumentRepository(prisma);

// ── Paiement (Stripe) ─────────────────────────────────────────────────────────
const stripePaymentGateway = new StripePaymentGateway(env.stripeSecretKey, env.stripeWebhookSecret);
const paymentMethodRepository = new PrismaPaymentMethodRepository(prisma);

const createPaymentIntentUseCase    = new CreatePaymentIntentUseCase(stripePaymentGateway);
const createSetupIntentUseCase      = new CreateSetupIntentUseCase(stripePaymentGateway);
const getSavedPaymentMethodsUseCase = new GetSavedPaymentMethodsUseCase(paymentMethodRepository);
const confirmPaymentMethodUseCase = new ConfirmPaymentMethodUseCase(paymentMethodRepository, stripePaymentGateway);
const removePaymentMethodUseCase = new RemovePaymentMethodUseCase(paymentMethodRepository, stripePaymentGateway);

// ── Commandes ────────────────────────────────────────────────────────────────
const orderRepository      = new PrismaOrderRepository(prisma);
const createOrderUseCase   = new CreateOrderUseCase(orderRepository, restaurantRepository);
const getUserOrdersUseCase = new GetUserOrdersUseCase(orderRepository);

// ── Restaurants ───────────────────────────────────────────────────────────────
const restaurantRepository          = new PrismaRestaurantRepository(prisma);
const getOwnerRestaurantsUseCase    = new GetOwnerRestaurantsUseCase(restaurantRepository);
const getRestaurantOrdersUseCase    = new GetRestaurantOrdersUseCase(orderRepository, restaurantRepository);
const createRestaurantUseCase       = new CreateRestaurantUseCase(restaurantRepository);
const updateRestaurantProfileUseCase = new UpdateRestaurantProfileUseCase(restaurantRepository);
const updateOpeningHoursUseCase     = new UpdateOpeningHoursUseCase(restaurantRepository);
const toggleRestaurantStatusUseCase = new ToggleRestaurantStatusUseCase(restaurantRepository);

// ── Menu ─────────────────────────────────────────────────────────────────────
const menuCategoryRepository            = new PrismaMenuCategoryRepository(prisma);
const menuItemRepository                = new PrismaMenuItemRepository(prisma);
const getRestaurantMenuUseCase          = new GetRestaurantMenuUseCase(menuCategoryRepository);
const createMenuCategoryUseCase         = new CreateMenuCategoryUseCase(menuCategoryRepository);
const updateMenuCategoryUseCase         = new UpdateMenuCategoryUseCase(menuCategoryRepository);
const deleteMenuCategoryUseCase         = new DeleteMenuCategoryUseCase(menuCategoryRepository);
const createMenuItemUseCase             = new CreateMenuItemUseCase(menuCategoryRepository, menuItemRepository);
const updateMenuItemUseCase             = new UpdateMenuItemUseCase(menuCategoryRepository, menuItemRepository);
const deleteMenuItemUseCase             = new DeleteMenuItemUseCase(menuCategoryRepository, menuItemRepository);
const toggleMenuItemAvailabilityUseCase = new ToggleMenuItemAvailabilityUseCase(menuCategoryRepository, menuItemRepository);
const updateMenuItemStockUseCase        = new UpdateMenuItemStockUseCase(menuCategoryRepository, menuItemRepository);
const createMenuItemOptionUseCase       = new CreateMenuItemOptionUseCase(menuCategoryRepository, menuItemRepository);
const exportMenuCsvUseCase              = new ExportMenuCsvUseCase(menuCategoryRepository);
const importMenuCsvUseCase              = new ImportMenuCsvUseCase(menuCategoryRepository, menuItemRepository);

// ── Notifications temps réel ───────────────────────────────────────────────────
// Proxy lazy : le gateway réel est injecté après démarrage d'Express/Socket.io.
let resolvedGateway: SocketIOGateway | null = null;
const notificationGatewayProxy: import("./application/ports/INotificationGateway.js").INotificationGateway = {
  notifyUser:       (userId, payload) => resolvedGateway?.notifyUser(userId, payload),
  broadcastToRoom:  (room, event, data) => resolvedGateway?.broadcastToRoom(room, event, data),
};

// ── Use cases dépendant du notificationGatewayProxy ──────────────────────────
const updateOrderStatusUseCase      = new UpdateOrderStatusUseCase(orderRepository, restaurantRepository, notificationGatewayProxy);

// ── Livreurs ──────────────────────────────────────────────────────────────────
const driverRepository             = new PrismaDriverRepository(prisma);
const toggleDriverStatusUseCase     = new ToggleDriverStatusUseCase(driverRepository);
const getAvailableDeliveriesUseCase = new GetAvailableDeliveriesUseCase(driverRepository);
const acceptDeliveryUseCase         = new AcceptDeliveryUseCase(driverRepository, orderRepository, notificationGatewayProxy);
const createDriverProfileUseCase    = new CreateDriverProfileUseCase(driverRepository);
const getDriverProfileUseCase       = new GetDriverProfileUseCase(driverRepository);
const getActiveDeliveryUseCase      = new GetActiveDeliveryUseCase(driverRepository);
const pickupDeliveryUseCase         = new PickupDeliveryUseCase(driverRepository, orderRepository, notificationGatewayProxy);
const completeDeliveryUseCase       = new CompleteDeliveryUseCase(driverRepository, orderRepository, notificationGatewayProxy);

// ── Administration ────────────────────────────────────────────────────────────
const getPendingDocumentsUseCase   = new GetPendingDocumentsUseCase(documentRepository);
const getDocumentsByStatusUseCase  = new GetDocumentsByStatusUseCase(documentRepository);
const updateDocumentStatusUseCase  = new UpdateDocumentStatusUseCase(documentRepository, notificationGatewayProxy);
const getAdminStatsUseCase         = new GetAdminStatsUseCase(documentRepository, userRepository, restaurantRepository);

// Nettoyage quotidien des refresh tokens expirés
setInterval(async () => {
  const count = await pruneExpiredRefreshTokensUseCase.execute();
  if (count > 0) console.log(`[cleanup]: ${count} refresh tokens expirés supprimés`);
}, 24 * 60 * 60 * 1000);

const startServer = async () => {
  if (env.httpFramework === "fastify") {
    const fastifyApp = createFastifyApp({
      userRepo: userRepository,
      refreshTokenRepo: refreshTokenRepository,
      tokenService: jwtTokenService,
      passwordHasher: bcryptPasswordHasher,
      getPendingDocumentsUseCase,
      updateDocumentStatusUseCase,
      corsOrigin: env.corsOrigins,
    });

    await fastifyApp.listen({
      port: Number(env.port),
      host: "0.0.0.0",
    });
    console.log(`[fastify]: http://localhost:${env.port}`);
    return;
  }

  const expressApp = createExpressApp({
    userRepository,
    refreshTokenRepository,
    tokenService: jwtTokenService,
    passwordHasher: bcryptPasswordHasher,
    documentRepository,
    createOrderUseCase,
    getUserOrdersUseCase,
    getRestaurantOrdersUseCase,
    updateOrderStatusUseCase,
    paymentGateway: stripePaymentGateway,
    paymentMethodRepository,
    createPaymentIntentUseCase,
    createSetupIntentUseCase,
    getSavedPaymentMethodsUseCase,
    confirmPaymentMethodUseCase,
    removePaymentMethodUseCase,
    restaurantRepository,
    getOwnerRestaurantsUseCase,
    createRestaurantUseCase,
    updateRestaurantProfileUseCase,
    updateOpeningHoursUseCase,
    toggleRestaurantStatusUseCase,
    getPendingDocumentsUseCase,
    getDocumentsByStatusUseCase,
    updateDocumentStatusUseCase,
    getAdminStatsUseCase,
    menuCategoryRepository,
    menuItemRepository,
    getRestaurantMenuUseCase,
    createMenuCategoryUseCase,
    updateMenuCategoryUseCase,
    deleteMenuCategoryUseCase,
    createMenuItemUseCase,
    updateMenuItemUseCase,
    deleteMenuItemUseCase,
    toggleMenuItemAvailabilityUseCase,
    updateMenuItemStockUseCase,
    createMenuItemOptionUseCase,
    exportMenuCsvUseCase,
    importMenuCsvUseCase,
    toggleDriverStatusUseCase,
    getAvailableDeliveriesUseCase,
    acceptDeliveryUseCase,
    createDriverProfileUseCase,
    getDriverProfileUseCase,
    getActiveDeliveryUseCase,
    pickupDeliveryUseCase,
    completeDeliveryUseCase,
    notificationGateway: notificationGatewayProxy,
    requireAuthentication,
    corsOrigin: env.corsOrigins,
  });

  const httpServer  = createServer(expressApp);
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