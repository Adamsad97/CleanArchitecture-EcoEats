import { Money } from "../value-objects/Money.js";
import { DRIVER_BASE_FEE_EUROS, DRIVER_PRICE_PER_KM_EUROS } from "./Order.js";
import type { Distance } from "../value-objects/Distance.js";

export type DriverEarningProps = {
  id:         string;
  driverId:   string;
  orderId:    string;
  distanceKm: number;
  tipEuros:   number;
};

/**
 * Entité DriverEarning — calcule le revenu d'un livreur pour une livraison.
 *
 * Règle métier (sujet) :
 *   total = prise en charge fixe + (prix au km × distance) + pourboire intégral.
 *   La plateforme ne prend AUCUNE commission sur la part du livreur.
 */
export class DriverEarning {
  readonly id:         string;
  readonly driverId:   string;
  readonly orderId:    string;
  readonly baseFee:    Money;
  readonly distanceFee: Money;
  readonly tip:        Money;
  readonly total:      Money;

  constructor(props: DriverEarningProps) {
    this.id       = props.id;
    this.driverId = props.driverId;
    this.orderId  = props.orderId;

    this.baseFee     = Money.fromEuros(DRIVER_BASE_FEE_EUROS);
    this.distanceFee = Money.fromEuros(DRIVER_PRICE_PER_KM_EUROS * props.distanceKm);
    this.tip         = Money.fromEuros(props.tipEuros);
    this.total       = this.baseFee.add(this.distanceFee).add(this.tip);
  }

  /**
   * Factory : calcule le gain depuis la distance réelle Haversine et le pourboire.
   */
  static compute(props: {
    id:         string;
    driverId:   string;
    orderId:    string;
    distance:   Distance;
    tipEuros:   number;
  }): DriverEarning {
    return new DriverEarning({
      id:         props.id,
      driverId:   props.driverId,
      orderId:    props.orderId,
      distanceKm: props.distance.kilometers,
      tipEuros:   props.tipEuros,
    });
  }
}
