import type { Result } from "../../../shared/Result.js";
import { ok, failure } from "../../../shared/Result.js";
import type { UseCase } from "../../../shared/UseCase.js";
import type { IDriverRepository } from "../../ports/IDriverRepository.js";
import type { DriverWallet } from "../../driver/types.js";
import { DriverNotFoundError } from "./ToggleDriverStatusUseCase.js";

/**
 * Use Case : consulter le portefeuille virtuel du livreur.
 *
 * Retourne le solde cumulé et l'historique détaillé des gains.
 * La plateforme ne prend aucune commission — le montant affiché
 * est intégralement acquis par le livreur.
 */
export class GetDriverWalletUseCase
  implements UseCase<string, DriverWallet, DriverNotFoundError>
{
  constructor(private readonly driverRepository: IDriverRepository) {}

  async execute(userId: string): Promise<Result<DriverWallet, DriverNotFoundError>> {
    const driver = await this.driverRepository.findByUserId(userId);
    if (!driver) return failure(new DriverNotFoundError());

    const wallet = await this.driverRepository.getWallet(driver.id);
    return ok(wallet);
  }
}
