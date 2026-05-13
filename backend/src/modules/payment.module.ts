import type { PrismaClient } from "../generated/prisma/client.js";
import type { Env } from "../infrastructure/config/env.js";
import { StripePaymentGateway } from "../infrastructure/payment/StripePaymentGateway.js";
import { PrismaPaymentMethodRepository } from "../infrastructure/repositories/PrismaPaymentMethodRepository.js";
import { CreatePaymentIntentUseCase } from "../application/usecases/payment/CreatePaymentIntentUseCase.js";
import { CreateSetupIntentUseCase } from "../application/usecases/payment/CreateSetupIntentUseCase.js";
import { GetSavedPaymentMethodsUseCase } from "../application/usecases/payment/GetSavedPaymentMethodsUseCase.js";
import { ConfirmPaymentMethodUseCase } from "../application/usecases/payment/ConfirmPaymentMethodUseCase.js";
import { RemovePaymentMethodUseCase } from "../application/usecases/payment/RemovePaymentMethodUseCase.js";

type Deps = { prisma: PrismaClient; env: Env };

/**
 * Module Payment — assemble Stripe + méthodes de paiement + tous les use cases paiement.
 *
 * Encapsule la configuration Stripe (clé secrète, webhook) dans ce seul fichier.
 */
export function buildPaymentModule({ prisma, env }: Deps) {
  const stripePaymentGateway    = new StripePaymentGateway(env.stripeSecretKey, env.stripeWebhookSecret);
  const paymentMethodRepository = new PrismaPaymentMethodRepository(prisma);

  return {
    stripePaymentGateway,
    paymentMethodRepository,
    createPaymentIntentUseCase:    new CreatePaymentIntentUseCase(stripePaymentGateway),
    createSetupIntentUseCase:      new CreateSetupIntentUseCase(stripePaymentGateway),
    getSavedPaymentMethodsUseCase: new GetSavedPaymentMethodsUseCase(paymentMethodRepository),
    confirmPaymentMethodUseCase:   new ConfirmPaymentMethodUseCase(paymentMethodRepository, stripePaymentGateway),
    removePaymentMethodUseCase:    new RemovePaymentMethodUseCase(paymentMethodRepository, stripePaymentGateway),
  };
}
