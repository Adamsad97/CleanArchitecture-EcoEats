import { describe, it, expect, beforeEach } from "vitest";
import { LoginUserUseCase } from "../../../application/usecases/auth/LoginUserUseCase.js";
import { InMemoryUserRepository } from "../../../infrastructure/databases/inmemory/InMemoryUserRepository.js";
import { InMemoryRefreshTokenRepository } from "../../../infrastructure/databases/inmemory/InMemoryRefreshTokenRepository.js";
import { TokenIssuer } from "../../../application/usecases/auth/TokenIssuer.js";

// Mock des services de sécurité
const mockTokenService = {
  signAccessToken:  () => "access-token",
  signRefreshToken: () => "refresh-token",
  verifyAccessToken:    () => ({ sub: "1", role: "CLIENT" } as any),
};

const mockPasswordHasher = {
  hash:    async () => "hashed",
  compare: async (plain: string) => plain === "password123",
};

describe("LoginUserUseCase", () => {
  let userRepository:         InMemoryUserRepository;
  let refreshTokenRepository: InMemoryRefreshTokenRepository;
  let tokenIssuer:            TokenIssuer;
  let useCase:                LoginUserUseCase;

  beforeEach(() => {
    userRepository         = new InMemoryUserRepository();
    refreshTokenRepository = new InMemoryRefreshTokenRepository();
    tokenIssuer            = new TokenIssuer(refreshTokenRepository, mockTokenService);
    useCase                = new LoginUserUseCase(userRepository, tokenIssuer, mockPasswordHasher);
  });

  it("doit réussir la connexion avec des identifiants valides", async () => {
    // Arrange
    await userRepository.create({
      email:    "test@example.com",
      name:     "Test User",
      passwordHash: "hashed",
      phone:    "0600000000",
      role:     "CLIENT",
    });

    // Act
    const result = await useCase.execute({ email: "test@example.com", password: "password123" });

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.email).toBe("test@example.com");
      expect(result.value.tokens.accessToken).toBe("access-token");
    }
  });

  it("doit échouer si l'utilisateur n'existe pas", async () => {
    const result = await useCase.execute({ email: "unknown@example.com", password: "password123" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_CREDENTIALS");
    }
  });

  it("doit échouer si le mot de passe est incorrect", async () => {
    await userRepository.create({
      email:    "test@example.com",
      name:     "Test User",
      passwordHash: "hashed",
      phone:    "0600000000",
      role:     "CLIENT",
    });

    const result = await useCase.execute({ email: "test@example.com", password: "wrong-password" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_CREDENTIALS");
    }
  });
});
