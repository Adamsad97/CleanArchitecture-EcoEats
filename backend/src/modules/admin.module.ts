import type { PrismaClient } from "../generated/prisma/client.js";
import { PrismaDocumentRepository } from "../infrastructure/repositories/PrismaDocumentRepository.js";
import { PrismaUserRepository } from "../infrastructure/repositories/PrismaUserRepository.js";
import { PrismaRestaurantRepository } from "../infrastructure/repositories/PrismaRestaurantRepository.js";
import { GetPendingDocumentsUseCase } from "../application/usecases/document/GetPendingDocumentsUseCase.js";
import { GetDocumentsByStatusUseCase } from "../application/usecases/document/GetDocumentsByStatusUseCase.js";
import { UpdateDocumentStatusUseCase } from "../application/usecases/document/UpdateDocumentStatusUseCase.js";
import { GetAdminStatsUseCase } from "../application/usecases/admin/GetAdminStatsUseCase.js";
import type { INotificationGateway } from "../application/ports/INotificationGateway.js";

type Deps = {
  prisma:               PrismaClient;
  notificationGateway?: INotificationGateway;
};

/**
 * Module Admin — assemble documents + stats administrateur.
 *
 * Crée ses propres instances de repositories (pas de dépendance sur d'autres modules)
 * pour rester indépendant et testable isolément.
 */
export function buildAdminModule({ prisma, notificationGateway }: Deps) {
  const documentRepository    = new PrismaDocumentRepository(prisma);
  const userRepository        = new PrismaUserRepository(prisma);
  const restaurantRepository  = new PrismaRestaurantRepository(prisma);

  const noop: INotificationGateway = {
    notifyUser:      () => undefined,
    broadcastToRoom: () => undefined,
  };
  const gateway = notificationGateway ?? noop;

  return {
    documentRepository,
    getPendingDocumentsUseCase:   new GetPendingDocumentsUseCase(documentRepository),
    getDocumentsByStatusUseCase:  new GetDocumentsByStatusUseCase(documentRepository),
    updateDocumentStatusUseCase:  new UpdateDocumentStatusUseCase(documentRepository, gateway),
    getAdminStatsUseCase:         new GetAdminStatsUseCase(documentRepository, userRepository, restaurantRepository),
  };
}
