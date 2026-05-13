import type { Request, Response, NextFunction } from "express";
import type { AnyZodObject } from "zod";

/**
 * Middleware de validation générique utilisant Zod.
 * Extrait la validation des routes pour améliorer la lisibilité.
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = await schema.safeParseAsync({
      body:   req.body,
      query:  req.query,
      params: req.params,
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors:  result.error.issues,
      });
    }

    // On remplace les données par les données parsées (typées)
    req.body   = result.data.body;
    req.query  = result.data.query;
    req.params = result.data.params;

    next();
  };
};
