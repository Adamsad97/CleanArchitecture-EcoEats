import type { PrismaUserRepository } from "../infrastructure/repositories/PrismaUserRepository.js";
import type { PrismaRefreshTokenRepository } from "../infrastructure/repositories/PrismaRefreshTokenRepository.js";
import type { JwtTokenService } from "../infrastructure/security/JwtTokenService.js";
import type { BcryptPasswordHasher } from "../infrastructure/security/BcryptPasswordHasher.js";
import { GetCurrentUserUseCase } from "../application/usecases/auth/GetCurrentUserUseCase.js";
import { PruneExpiredRefreshTokensUseCase } from "../application/usecases/auth/PruneExpiredRefreshTokensUseCase.js";
import { createRequireAuth } from "../interfaces/middlewares/requireAuth.js";

type Deps = {
  userRepository:         PrismaUserRepository;
  refreshTokenRepository: PrismaRefreshTokenRepository;
  jwtTokenService:        JwtTokenService;
  bcryptPasswordHasher:   BcryptPasswordHasher;
};

/**
 * Module Auth — assemble la sécurité (JWT, bcrypt) et les middlewares d'authentification.
 *
 * `requireAuthentication` est le seul artefact partagé avec les autres modules —
 * il est injecté dans les routes HTTP.
 */
export function buildAuthModule({ userRepository, refreshTokenRepository, jwtTokenService, bcryptPasswordHasher }: Deps) {
  const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository, jwtTokenService);

  return {
    getCurrentUserUseCase,
    pruneExpiredRefreshTokensUseCase: new PruneExpiredRefreshTokensUseCase(refreshTokenRepository),
    requireAuthentication:            createRequireAuth(getCurrentUserUseCase),
  };
}
