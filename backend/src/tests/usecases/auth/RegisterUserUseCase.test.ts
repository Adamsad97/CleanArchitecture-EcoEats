import { describe, it, expect, beforeEach } from "vitest";
import { RegisterUserUseCase } from "../../../application/usecases/auth/RegisterUserUseCase.js";
import { InMemoryUserRepository } from "../../../infrastructure/databases/inmemory/InMemoryUserRepository.js";
import { InMemoryRefreshTokenRepository } from "../../../infrastructure/databases/inmemory/InMemoryRefreshTokenRepository.js";
import { TokenIssuer } from "../../../application/usecases/auth/TokenIssuer.js";

const mockTokenService = {
  signAccessToken:  () => "access-token",
  signRefreshToken: () => "refresh-token",
  verifyAccessToken:    () => ({ sub: "1", role: "CLIENT" } as any),
};

const mockPasswordHasher = {
  hash:    async () => "hashed_password",
  compare: async () => true,
};

describe("RegisterUserUseCase", () => {
  let userRepository:         InMemoryUserRepository;
  let refreshTokenRepository: InMemoryRefreshTokenRepository;
  let tokenIssuer:            TokenIssuer;
  let useCase:                RegisterUserUseCase;

  beforeEach(() => {
    userRepository         = new InMemoryUserRepository();
    refreshTokenRepository = new InMemoryRefreshTokenRepository();
    tokenIssuer            = new TokenIssuer(refreshTokenRepository, mockTokenService);
    useCase                = new RegisterUserUseCase(userRepository, tokenIssuer, mockPasswordHasher);
  });

  it("doit créer un nouvel utilisateur avec succès", async () => {
    const result = await useCase.execute({
      email:    "new@example.com",
      name:     "New User",
      password: "password123",
      phone:    "0611223344",
      role:     "CLIENT",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.email).toBe("new@example.com");
      const createdUser = await userRepository.findByEmail("new@example.com");
      expect(createdUser).toBeDefined();
    }
  });

  it("doit échouer si l'email est déjà utilisé", async () => {
    await userRepository.create({
      email:    "existing@example.com",
      name:     "Existing",
      passwordHash: "hash",
      phone:    "0600000000",
      role:     "CLIENT",
    });

    const result = await useCase.execute({
      email:    "existing@example.com",
      name:     "Other",
      password: "pass",
      phone:    "0699887766",
      role:     "CLIENT",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EMAIL_ALREADY_IN_USE");
    }
  });
});
