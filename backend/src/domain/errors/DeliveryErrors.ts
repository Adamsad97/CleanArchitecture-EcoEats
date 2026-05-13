import { DomainError } from "./DomainError.js";

export class DriverUnavailableError extends DomainError {
  readonly code = "DRIVER_UNAVAILABLE";
  constructor() { super("Le livreur est actuellement indisponible."); }
}

export class DeliveryCapacityExceededError extends DomainError {
  readonly code = "DELIVERY_CAPACITY_EXCEEDED";
  constructor() {
    super(
      "Un livreur ne peut accepter qu'une seule livraison à la fois " +
      "(deux uniquement pour les livreurs Expert, du même restaurant).",
    );
  }
}

export class DeliveryAlreadyTakenError extends DomainError {
  readonly code = "DELIVERY_ALREADY_TAKEN";
  constructor() { super("Cette commande a déjà été prise en charge par un autre livreur."); }
}

export class DeliveryNotFoundError extends DomainError {
  readonly code = "DELIVERY_NOT_FOUND";
  constructor() { super("Livraison introuvable."); }
}
