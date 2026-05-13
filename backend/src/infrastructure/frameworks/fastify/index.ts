import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { RegisterUserUseCase } from "../../../application/usecases/auth/RegisterUserUseCase.js";
import { LoginUserUseCase } from "../../../application/usecases/auth/LoginUserUseCase.js";
import { RefreshTokenUseCase } from "../../../application/usecases/auth/RefreshTokenUseCase.js";
import { LogoutUseCase } from "../../../application/usecases/auth/LogoutUseCase.js";
import { GetCurrentUserUseCase } from "../../../application/usecases/auth/GetCurrentUserUseCase.js";
import { TokenIssuer } from "../../../application/usecases/auth/TokenIssuer.js";
import type { IUserRepository } from "../../../application/ports/IUserRepository.js";
import type { IRefreshTokenRepository } from "../../../application/ports/IRefreshTokenRepository.js";
import type { ITokenService } from "../../../application/ports/ITokenService.js";
import type { IPasswordHasher } from "../../../application/ports/IPasswordHasher.js";
import type { GetPendingDocumentsUseCase } from "../../../application/usecases/document/GetPendingDocumentsUseCase.js";
import type { UpdateDocumentStatusUseCase } from "../../../application/usecases/document/UpdateDocumentStatusUseCase.js";
import type { GetRestaurantMenuUseCase } from "../../../application/usecases/menu/GetRestaurantMenuUseCase.js";
import type { IRestaurantRepository } from "../../../application/ports/IRestaurantRepository.js";
import type { RegisterInput, LoginInput } from "../../../application/auth/types.js";
import { DocumentPresenter } from "../../../interfaces/presenters/DocumentPresenter.js";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

function mapDomainErrorToStatus(code: string): number {
  switch (code) {
    case "USER_ALREADY_EXISTS":
    case "INVALID_CREDENTIALS":
    case "INVALID_REFRESH_TOKEN":
    case "PASSWORD_REQUIRED":
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      return 401;
    case "NOT_FOUND":
      return 404;
    default:
      return 400;
  }
}

/**
 * Adaptateur Fastify — prouve que les Use Cases sont indépendants du framework HTTP.
 * Les mêmes Use Cases sont utilisés par Express (index.ts) et par Fastify (ici).
 */
export function createFastifyApp(deps: {
  userRepo:         IUserRepository;
  refreshTokenRepo: IRefreshTokenRepository;
  tokenService:     ITokenService;
  passwordHasher:   IPasswordHasher;
  getPendingDocumentsUseCase:  GetPendingDocumentsUseCase;
  updateDocumentStatusUseCase: UpdateDocumentStatusUseCase;
  getRestaurantMenuUseCase:    GetRestaurantMenuUseCase;
  restaurantRepository:        IRestaurantRepository;
  corsOrigin: string | string[];
}) {
  const {
    userRepo,
    refreshTokenRepo,
    tokenService,
    passwordHasher,
    getPendingDocumentsUseCase,
    updateDocumentStatusUseCase,
    getRestaurantMenuUseCase,
    restaurantRepository,
    corsOrigin,
  } = deps;

  const tokenIssuer        = new TokenIssuer(refreshTokenRepo, tokenService);
  const registerUseCase    = new RegisterUserUseCase(userRepo, tokenIssuer, passwordHasher);
  const loginUseCase       = new LoginUserUseCase(userRepo, tokenIssuer, passwordHasher);
  const refreshUseCase     = new RefreshTokenUseCase(refreshTokenRepo, tokenService);
  const logoutUseCase      = new LogoutUseCase(refreshTokenRepo);
  const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepo, tokenService);

  const fastifyApp = Fastify({ logger: false });

  fastifyApp.register(helmet);
  fastifyApp.register(cors, { origin: corsOrigin });

  const resolveCurrentUser = async (authorizationHeader?: string) => {
    const accessToken = (authorizationHeader ?? "").replace("Bearer ", "");
    if (!accessToken) return null;
    const result = await getCurrentUserUseCase.execute(accessToken);
    return result.ok ? result.value : null;
  };

  const requireAdmin = async (authorizationHeader?: string) => {
    const currentUser = await resolveCurrentUser(authorizationHeader);
    if (!currentUser) {
      return { ok: false as const, status: 401, message: "Token invalide" };
    }
    if (currentUser.role !== "ADMIN") {
      return { ok: false as const, status: 403, message: "Accès réservé aux administrateurs" };
    }
    return { ok: true as const, user: currentUser };
  };

  /* ── Auth ── */

  fastifyApp.post<{ Body: RegisterInput }>("/auth/register/email", async (request, reply) => {
    const result = await registerUseCase.execute(request.body);
    if (!result.ok) return reply.code(mapDomainErrorToStatus(result.error.code)).send({ message: result.error.message });
    return reply.code(201).send(result.value);
  });

  fastifyApp.post<{ Body: LoginInput }>("/auth/login/email", async (request, reply) => {
    const result = await loginUseCase.execute(request.body);
    if (!result.ok) return reply.code(mapDomainErrorToStatus(result.error.code)).send({ message: result.error.message });
    return reply.send(result.value);
  });

  fastifyApp.post<{ Body: { refreshToken: string } }>("/auth/refresh", async (request, reply) => {
    const result = await refreshUseCase.execute(request.body.refreshToken ?? "");
    if (!result.ok) return reply.code(401).send({ message: result.error.message });
    return reply.send(result.value);
  });

  fastifyApp.post<{ Body: { refreshToken: string } }>("/auth/logout", async (request, reply) => {
    await logoutUseCase.execute(request.body.refreshToken ?? "");
    return reply.code(204).send();
  });

  fastifyApp.get("/auth/me", async (request, reply) => {
    const accessToken = (request.headers.authorization ?? "").replace("Bearer ", "");
    const result = await getCurrentUserUseCase.execute(accessToken);
    if (!result.ok) return reply.code(401).send({ message: result.error.message });
    return reply.send(result.value);
  });

  fastifyApp.get("/health", async (_request, reply) => reply.send({ status: "ok", framework: "fastify" }));

  /* ── Restaurants & Menu (Exemple de réutilisation de Use Case) ── */

  fastifyApp.get("/restaurants", async () => {
    return restaurantRepository.findAll();
  });

  fastifyApp.get<{ Params: { id: string } }>("/restaurants/:id/menu", async (request, reply) => {
    const result = await getRestaurantMenuUseCase.execute(request.params.id);
    if (!result.ok) return reply.code(404).send({ message: result.error.message });
    return reply.send(result.value);
  });

  /* ── Admin ── */

  fastifyApp.get("/admin/documents", async (request, reply) => {
    const adminAccess = await requireAdmin(request.headers.authorization);
    if (!adminAccess.ok) {
      return reply.code(adminAccess.status).send({ message: adminAccess.message });
    }

    const documents = await getPendingDocumentsUseCase.execute();
    return reply.send(DocumentPresenter.toAdminDtoList(documents));
  });

  fastifyApp.patch<{ Params: { id: string }; Body: { status: "approved" | "rejected" } }>(
    "/admin/documents/:id/status",
    async (request, reply) => {
      const adminAccess = await requireAdmin(request.headers.authorization);
      if (!adminAccess.ok) {
        return reply.code(adminAccess.status).send({ message: adminAccess.message });
      }

      const { id } = request.params;
      if (!id) {
        return reply.code(400).send({ message: "Identifiant manquant" });
      }

      const parsed = updateStatusSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Statut invalide (approved | rejected)" });
      }

      const result = await updateDocumentStatusUseCase.execute({
        documentId: id,
        status: parsed.data.status,
      });

      if (!result.ok) {
        return reply.code(404).send({ message: result.error.message });
      }

      return reply.send(DocumentPresenter.toDto(result.value));
    },
  );

  return fastifyApp;
}
