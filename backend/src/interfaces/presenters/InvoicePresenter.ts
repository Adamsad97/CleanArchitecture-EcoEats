import type { InvoiceData } from "../../application/ports/IOrderRepository.js";

export type InvoiceLineDto = {
  name:       string;
  quantity:   number;
  unitPrice:  string;
  lineTotal:  string;
};

export type InvoiceDto = {
  orderId:        string;
  restaurantName: string;
  lines:          InvoiceLineDto[];
  subtotal:       string;
  deliveryFee:    string;
  tipAmount:      string;
  total:          string;
  createdAt:      string;
};

/**
 * Présenteur Facture — transforme le modèle de lecture (InvoiceData)
 * en DTO HTTP prêt à sérialiser.
 *
 * Responsabilité unique : formatage des montants en euros (2 décimales).
 */
export class InvoicePresenter {
  private static formatEuros(euros: number): string {
    return `${euros.toFixed(2)} €`;
  }

  static toDto(data: InvoiceData): InvoiceDto {
    return {
      orderId:        data.orderId,
      restaurantName: data.restaurantName,
      lines: data.items.map((item) => ({
        name:      item.name,
        quantity:  item.quantity,
        unitPrice: InvoicePresenter.formatEuros(item.unitPrice),
        lineTotal: InvoicePresenter.formatEuros(item.unitPrice * item.quantity),
      })),
      subtotal:    InvoicePresenter.formatEuros(data.subtotal),
      deliveryFee: InvoicePresenter.formatEuros(data.deliveryFee),
      tipAmount:   InvoicePresenter.formatEuros(data.tipAmount),
      total:       InvoicePresenter.formatEuros(data.total),
      createdAt:   data.createdAt,
    };
  }
}
