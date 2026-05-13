import type { Result } from "../../../shared/Result.js";
import { ok, failure } from "../../../shared/Result.js";
import type { UseCase } from "../../../shared/UseCase.js";
import type { IOrderRepository, InvoiceData } from "../../ports/IOrderRepository.js";
import { DomainError } from "../../../domain/errors/DomainError.js";

export class InvoiceNotFoundError extends DomainError {
  readonly code = "INVOICE_NOT_FOUND";
  constructor() {
    super("Facture introuvable ou vous n'êtes pas autorisé à y accéder.");
  }
}

export type GetOrderInvoiceInput = {
  orderId: string;
  userId:  string;
};

/**
 * Use Case : générer la facture d'une commande payée.
 *
 * Règle : seul le client qui a passé la commande peut consulter sa facture.
 * La facture détaille : articles, frais de livraison, pourboire, total.
 */
export class GetOrderInvoiceUseCase
  implements UseCase<GetOrderInvoiceInput, InvoiceData, InvoiceNotFoundError>
{
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(input: GetOrderInvoiceInput): Promise<Result<InvoiceData, InvoiceNotFoundError>> {
    const invoice = await this.orderRepository.findByIdForInvoice(input.orderId, input.userId);
    if (!invoice) return failure(new InvoiceNotFoundError());

    return ok(invoice);
  }
}
