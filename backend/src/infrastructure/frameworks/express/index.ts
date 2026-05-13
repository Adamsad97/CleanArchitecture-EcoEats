import express from "express";
import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import type { IDocumentRepository } from "../../../application/ports/IDocumentRepository.js";
import type { IPasswordHasher } from "../../../application/ports/IPasswordHasher.js";
import type { IPaymentGateway } from "../../../application/ports/IPaymentGateway.js";
import type { IPaymentMethodRepository } from "../../../application/ports/IPaymentMethodRepository.js";
import type { IRefreshTokenRepository } from "../../../application/ports/IRefreshTokenRepository.js";
import type { ITokenService } from "../../../application/ports/ITokenService.js";
import type { IUserRepository } from "../../../application/ports/IUserRepository.js";
import type { ConfirmPaymentMethodUseCase } from "../../../application/usecases/payment/ConfirmPaymentMethodUseCase.js";
import type { CreatePaymentIntentUseCase } from "../../../application/usecases/payment/CreatePaymentIntentUseCase.js";
import type { CreateSetupIntentUseCase } from "../../../application/usecases/payment/CreateSetupIntentUseCase.js";
import type { GetSavedPaymentMethodsUseCase } from "../../../application/usecases/payment/GetSavedPaymentMethodsUseCase.js";
import type { RemovePaymentMethodUseCase } from "../../../application/usecases/payment/RemovePaymentMethodUseCase.js";
import type { IRestaurantRepository } from "../../../application/ports/IRestaurantRepository.js";
import type { INotificationGateway } from "../../../application/ports/INotificationGateway.js";
import type { GetOwnerRestaurantsUseCase } from "../../../application/usecases/restaurant/GetOwnerRestaurantsUseCase.js";
import type { CreateRestaurantUseCase } from "../../../application/usecases/restaurant/CreateRestaurantUseCase.js";
import type { UpdateRestaurantProfileUseCase } from "../../../application/usecases/restaurant/UpdateRestaurantProfileUseCase.js";
import type { UpdateOpeningHoursUseCase } from "../../../application/usecases/restaurant/UpdateOpeningHoursUseCase.js";
import type { ToggleRestaurantStatusUseCase } from "../../../application/usecases/restaurant/ToggleRestaurantStatusUseCase.js";
import type { GetPendingDocumentsUseCase } from "../../../application/usecases/document/GetPendingDocumentsUseCase.js";
import type { GetDocumentsByStatusUseCase } from "../../../application/usecases/document/GetDocumentsByStatusUseCase.js";
import type { UpdateDocumentStatusUseCase } from "../../../application/usecases/document/UpdateDocumentStatusUseCase.js";
import type { GetAdminStatsUseCase } from "../../../application/usecases/admin/GetAdminStatsUseCase.js";
import { createRequireAdmin } from "../../../interfaces/middlewares/requireAdmin.js";
import { createAuthRoutes } from "../../../interfaces/http/auth/index.js";
import { createAdminDocumentRoutes } from "../../../interfaces/http/admin/adminDocumentRoutes.js";
import { createDocumentRoutes } from "../../../interfaces/http/documents/documentRoutes.js";
import { createPaymentRoutes } from "../../../interfaces/http/payment/index.js";
import { createRestaurantRoutes } from "../../../interfaces/http/restaurants/restaurantRoutes.js";
import { createUserRoutes } from "../../../interfaces/http/users/userRoutes.js";
import type { CreateOrderUseCase } from "../../../application/usecases/order/CreateOrderUseCase.js";
import type { GetUserOrdersUseCase } from "../../../application/usecases/order/GetUserOrdersUseCase.js";
import type { GetRestaurantOrdersUseCase } from "../../../application/usecases/order/GetRestaurantOrdersUseCase.js";
import type { UpdateOrderStatusUseCase } from "../../../application/usecases/order/UpdateOrderStatusUseCase.js";
import { createOrderRoutes } from "../../../interfaces/http/orders/orderRoutes.js";
import type { GetOrderInvoiceUseCase } from "../../../application/usecases/order/GetOrderInvoiceUseCase.js";
import type { ToggleDriverStatusUseCase } from "../../../application/usecases/driver/ToggleDriverStatusUseCase.js";
import type { GetAvailableDeliveriesUseCase } from "../../../application/usecases/driver/GetAvailableDeliveriesUseCase.js";
import type { AcceptDeliveryUseCase } from "../../../application/usecases/driver/AcceptDeliveryUseCase.js";
import type { CreateDriverProfileUseCase } from "../../../application/usecases/driver/CreateDriverProfileUseCase.js";
import type { GetDriverProfileUseCase } from "../../../application/usecases/driver/GetDriverProfileUseCase.js";
import type { GetActiveDeliveryUseCase } from "../../../application/usecases/driver/GetActiveDeliveryUseCase.js";
import type { PickupDeliveryUseCase } from "../../../application/usecases/driver/PickupDeliveryUseCase.js";
import type { CompleteDeliveryUseCase } from "../../../application/usecases/driver/CompleteDeliveryUseCase.js";
import { createDriverRoutes } from "../../../interfaces/http/driver/driverRoutes.js";
import type { GetDriverWalletUseCase } from "../../../application/usecases/driver/GetDriverWalletUseCase.js";
import { createMenuRoutes } from "../../../interfaces/http/menu/menuRoutes.js";
import type { IMenuCategoryRepository } from "../../../application/ports/IMenuCategoryRepository.js";
import type { IMenuItemRepository } from "../../../application/ports/IMenuItemRepository.js";
import type { GetRestaurantMenuUseCase } from "../../../application/usecases/menu/GetRestaurantMenuUseCase.js";
import type { CreateMenuCategoryUseCase } from "../../../application/usecases/menu/CreateMenuCategoryUseCase.js";
import type { UpdateMenuCategoryUseCase } from "../../../application/usecases/menu/UpdateMenuCategoryUseCase.js";
import type { DeleteMenuCategoryUseCase } from "../../../application/usecases/menu/DeleteMenuCategoryUseCase.js";
import type { CreateMenuItemUseCase } from "../../../application/usecases/menu/CreateMenuItemUseCase.js";
import type { UpdateMenuItemUseCase } from "../../../application/usecases/menu/UpdateMenuItemUseCase.js";
import type { DeleteMenuItemUseCase } from "../../../application/usecases/menu/DeleteMenuItemUseCase.js";
import type { ToggleMenuItemAvailabilityUseCase } from "../../../application/usecases/menu/ToggleMenuItemAvailabilityUseCase.js";
import type { UpdateMenuItemStockUseCase } from "../../../application/usecases/menu/UpdateMenuItemStockUseCase.js";
import type { CreateMenuItemOptionUseCase } from "../../../application/usecases/menu/CreateMenuItemOptionUseCase.js";
import type { ExportMenuCsvUseCase } from "../../../application/usecases/menu/ExportMenuCsvUseCase.js";
import type { ImportMenuCsvUseCase } from "../../../application/usecases/menu/ImportMenuCsvUseCase.js";
import { MetricsService } from "../../monitoring/MetricsService.js";

export type ExpressFrameworkDependencies = {
  userRepository: IUserRepository;
  refreshTokenRepository: IRefreshTokenRepository;
  tokenService: ITokenService;
  passwordHasher: IPasswordHasher;
  documentRepository: IDocumentRepository;
  paymentGateway: IPaymentGateway;
  paymentMethodRepository: IPaymentMethodRepository;
  createPaymentIntentUseCase: CreatePaymentIntentUseCase;
  createSetupIntentUseCase: CreateSetupIntentUseCase;
  getSavedPaymentMethodsUseCase: GetSavedPaymentMethodsUseCase;
  confirmPaymentMethodUseCase: ConfirmPaymentMethodUseCase;
  removePaymentMethodUseCase: RemovePaymentMethodUseCase;
  restaurantRepository:           IRestaurantRepository;
  getOwnerRestaurantsUseCase:     GetOwnerRestaurantsUseCase;
  createRestaurantUseCase:        CreateRestaurantUseCase;
  updateRestaurantProfileUseCase: UpdateRestaurantProfileUseCase;
  updateOpeningHoursUseCase:      UpdateOpeningHoursUseCase;
  toggleRestaurantStatusUseCase:  ToggleRestaurantStatusUseCase;
  getPendingDocumentsUseCase:    GetPendingDocumentsUseCase;
  getDocumentsByStatusUseCase:   GetDocumentsByStatusUseCase;
  updateDocumentStatusUseCase:   UpdateDocumentStatusUseCase;
  getAdminStatsUseCase:              GetAdminStatsUseCase;
  menuCategoryRepository:            IMenuCategoryRepository;
  menuItemRepository:                IMenuItemRepository;
  getRestaurantMenuUseCase:          GetRestaurantMenuUseCase;
  createMenuCategoryUseCase:         CreateMenuCategoryUseCase;
  updateMenuCategoryUseCase:         UpdateMenuCategoryUseCase;
  deleteMenuCategoryUseCase:         DeleteMenuCategoryUseCase;
  createMenuItemUseCase:             CreateMenuItemUseCase;
  updateMenuItemUseCase:             UpdateMenuItemUseCase;
  deleteMenuItemUseCase:             DeleteMenuItemUseCase;
  toggleMenuItemAvailabilityUseCase: ToggleMenuItemAvailabilityUseCase;
  updateMenuItemStockUseCase:        UpdateMenuItemStockUseCase;
  createMenuItemOptionUseCase:       CreateMenuItemOptionUseCase;
  exportMenuCsvUseCase:              ExportMenuCsvUseCase;
  importMenuCsvUseCase:              ImportMenuCsvUseCase;
  createOrderUseCase:                CreateOrderUseCase;
  getUserOrdersUseCase:               GetUserOrdersUseCase;
  getRestaurantOrdersUseCase:         GetRestaurantOrdersUseCase;
  updateOrderStatusUseCase:           UpdateOrderStatusUseCase;
  getOrderInvoiceUseCase:             GetOrderInvoiceUseCase;
  toggleDriverStatusUseCase:         ToggleDriverStatusUseCase;
  getAvailableDeliveriesUseCase:     GetAvailableDeliveriesUseCase;
  acceptDeliveryUseCase:             AcceptDeliveryUseCase;
  createDriverProfileUseCase:        CreateDriverProfileUseCase;
  getDriverProfileUseCase:           GetDriverProfileUseCase;
  getActiveDeliveryUseCase:          GetActiveDeliveryUseCase;
  pickupDeliveryUseCase:             PickupDeliveryUseCase;
  completeDeliveryUseCase:           CompleteDeliveryUseCase;
  getDriverWalletUseCase:            GetDriverWalletUseCase;
  notificationGateway:               INotificationGateway;
  metricsService:                    MetricsService;
  requireAuthentication: RequestHandler;
  corsOrigin: string | string[];
};

export const createExpressApp = (dependencies: ExpressFrameworkDependencies): Express => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: dependencies.corsOrigin }));

  // Stripe webhook requires raw body before express.json middleware.
  app.use("/payment/webhook", express.raw({ type: "application/json" }));
  app.use(express.json());
  
  // Middleware de métriques
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();
    res.on("finish", () => {
      const diff = process.hrtime(start);
      const duration = diff[0] + diff[1] / 1e9;
      const route = req.route ? req.route.path : req.path;
      
      MetricsService.httpRequestDuration.observe(
        { method: req.method, route, status_code: res.statusCode },
        duration
      );
      MetricsService.totalRequests.inc(
        { method: req.method, route, status_code: res.statusCode }
      );
    });
    next();
  });
  app.use("/uploads", express.static("uploads"));

  app.use(
    "/auth",
    createAuthRoutes(
      dependencies.userRepository,
      dependencies.refreshTokenRepository,
      dependencies.tokenService,
      dependencies.passwordHasher,
      dependencies.requireAuthentication,
    ),
  );
  app.use("/documents", createDocumentRoutes(dependencies.documentRepository, dependencies.requireAuthentication, dependencies.notificationGateway));
  app.use("/users",     createUserRoutes(dependencies.userRepository, dependencies.requireAuthentication));
  app.use(
    "/orders",
    createOrderRoutes(
      dependencies.createOrderUseCase,
      dependencies.getUserOrdersUseCase,
      dependencies.getRestaurantOrdersUseCase,
      dependencies.updateOrderStatusUseCase,
      dependencies.getOrderInvoiceUseCase,
      dependencies.paymentMethodRepository,
      dependencies.requireAuthentication,
    ),
  );
  app.use(
    "/payment",
    createPaymentRoutes(
      dependencies.createPaymentIntentUseCase,
      dependencies.createSetupIntentUseCase,
      dependencies.getSavedPaymentMethodsUseCase,
      dependencies.confirmPaymentMethodUseCase,
      dependencies.removePaymentMethodUseCase,
      dependencies.paymentGateway,
      dependencies.paymentMethodRepository,
      dependencies.requireAuthentication,
    ),
  );

  app.use(
    "/restaurants",
    createRestaurantRoutes(
      dependencies.getOwnerRestaurantsUseCase,
      dependencies.createRestaurantUseCase,
      dependencies.updateRestaurantProfileUseCase,
      dependencies.updateOpeningHoursUseCase,
      dependencies.toggleRestaurantStatusUseCase,
      dependencies.restaurantRepository,
      dependencies.requireAuthentication,
    ),
  );

  app.use(
    "/restaurants/:restaurantId/menu",
    createMenuRoutes(
      dependencies.getRestaurantMenuUseCase,
      dependencies.createMenuCategoryUseCase,
      dependencies.updateMenuCategoryUseCase,
      dependencies.deleteMenuCategoryUseCase,
      dependencies.createMenuItemUseCase,
      dependencies.updateMenuItemUseCase,
      dependencies.deleteMenuItemUseCase,
      dependencies.toggleMenuItemAvailabilityUseCase,
      dependencies.updateMenuItemStockUseCase,
      dependencies.createMenuItemOptionUseCase,
      dependencies.exportMenuCsvUseCase,
      dependencies.importMenuCsvUseCase,
      dependencies.menuItemRepository,
      dependencies.menuCategoryRepository,
      dependencies.requireAuthentication,
    ),
  );

  app.use("/driver", createDriverRoutes(
    dependencies.toggleDriverStatusUseCase,
    dependencies.getAvailableDeliveriesUseCase,
    dependencies.acceptDeliveryUseCase,
    dependencies.createDriverProfileUseCase,
    dependencies.getDriverProfileUseCase,
    dependencies.getActiveDeliveryUseCase,
    dependencies.pickupDeliveryUseCase,
    dependencies.completeDeliveryUseCase,
    dependencies.getDriverWalletUseCase,
    dependencies.notificationGateway,
    dependencies.requireAuthentication,
  ));

  const requireAdmin = createRequireAdmin(dependencies.requireAuthentication);
  app.use("/admin", createAdminDocumentRoutes(
    dependencies.getPendingDocumentsUseCase,
    dependencies.getDocumentsByStatusUseCase,
    dependencies.updateDocumentStatusUseCase,
    dependencies.getAdminStatsUseCase,
    requireAdmin,
  ));

  app.get("/", (_request: Request, response: Response) => response.json({ message: "EcoEats API — Express" }));
  app.get("/health", (_request: Request, response: Response) => response.json({ status: "ok", framework: "express" }));
  app.get("/metrics", async (_request: Request, response: Response) => {
    response.setHeader("Content-Type", dependencies.metricsService.getContentType());
    response.send(await dependencies.metricsService.getMetrics());
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
    console.error("[error]:", error.message);
    response.status(500).json({ message: "Erreur interne du serveur" });
  });

  return app;
};
