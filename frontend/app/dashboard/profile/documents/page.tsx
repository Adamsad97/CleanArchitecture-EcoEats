"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../auth/context/AuthContext";
import { useNotifications } from "../../../auth/context/NotificationContext";
import { getMyDocuments, uploadDocument } from "../../../auth/services/documentService";
import { getStoredAccessToken } from "../../../auth/services/tokenHelper";
import type { DocumentRecord, DocumentType } from "../../../auth/services/documentService";
import type { UserRole } from "../../../auth/types";

const DOC_LABELS: Record<DocumentType, string> = {
  kbis:                 "Extrait Kbis",
  id_card:              "Pièce d'identité",
  driving_license:      "Permis de conduire",
  vehicle_insurance:    "Assurance véhicule",
  vehicle_registration: "Carte grise",
  food_hygiene:         "Attestation d'hygiène",
};

const REQUIRED_BY_ROLE: Partial<Record<UserRole, DocumentType[]>> = {
  RESTAURANT_OWNER: ["kbis", "id_card", "food_hygiene"],
  DRIVER:           ["id_card", "driving_license", "vehicle_insurance", "vehicle_registration"],
};

function StatusBadge({ status }: { status: DocumentRecord["status"] | "missing" }) {
  if (status === "approved") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1">
      ✓ Validé
    </span>
  );
  if (status === "rejected") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1">
      ✕ Refusé
    </span>
  );
  if (status === "missing") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1">
      Non déposé
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1">
      <span className="animate-pulse">●</span> En attente de validation
    </span>
  );
}

export default function DocumentsProfilePage() {
  const { user, tokens } = useAuth();
  const { history } = useNotifications();

  const [documents,   setDocuments]   = useState<DocumentRecord[]>([]);
  const [loading,     setLoading]     = useState(Boolean(tokens?.accessToken));
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [uploadErrors,  setUploadErrors]  = useState<Partial<Record<DocumentType, string>>>({});

  const inputRefs = useRef<Partial<Record<DocumentType, HTMLInputElement | null>>>({});

  const loadDocuments = async (accessToken: string) => {
    const result = await getMyDocuments(accessToken);
    setDocuments(result.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!tokens?.accessToken) return;
    const timer = setTimeout(() => { void loadDocuments(tokens.accessToken); }, 0);
    return () => clearTimeout(timer);
  }, [tokens]);

  // Rechargement automatique quand un document est validé ou refusé en temps réel
  useEffect(() => {
    const latest = history[0];
    if (!latest) return;
    if (latest.type !== "document_validated" && latest.type !== "document_rejected") return;

    const token = tokens?.accessToken ?? getStoredAccessToken();
    if (!token) return;
    const timer = setTimeout(() => { void loadDocuments(token); }, 0);
    return () => clearTimeout(timer);
  }, [history]);

  const handleReplace = async (type: DocumentType, file: File) => {
    if (!tokens?.accessToken) return;

    setUploadingType(type);
    setUploadErrors((previous) => ({ ...previous, [type]: undefined }));

    const result = await uploadDocument(type, file, tokens.accessToken);

    if (result.ok && result.data) {
      setDocuments((previous) => {
        const withoutOldVersion = previous.filter((document) => document.type !== type);
        return [...withoutOldVersion, result.data!];
      });
    } else {
      setUploadErrors((previous) => ({
        ...previous,
        [type]: result.message ?? "Erreur lors de l'envoi",
      }));
    }

    setUploadingType(null);
  };

  if (!user) return null;

  const requiredTypes = REQUIRED_BY_ROLE[user.role] ?? [];

  if (requiredTypes.length === 0) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <p className="text-slate-500 text-sm">Aucun document requis pour votre type de compte.</p>
        </div>
      </div>
    );
  }

  const getLatestDocumentByType = (type: DocumentType) =>
    documents
      .filter((document) => document.type === type)
      .sort((newer, older) => new Date(older.createdAt).getTime() - new Date(newer.createdAt).getTime())[0];

  const allApproved  = requiredTypes.every((type) => getLatestDocumentByType(type)?.status === "approved");
  const hasRejected  = requiredTypes.some((type)  => getLatestDocumentByType(type)?.status === "rejected");
  const allSubmitted = requiredTypes.every((type) => !!getLatestDocumentByType(type));

  const canReplace = (status: DocumentRecord["status"] | "missing") =>
    status === "pending" || status === "rejected" || status === "missing";

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
          Documents justificatifs
        </h3>

        {loading ? (
          <p className="text-sm text-slate-400">Chargement…</p>
        ) : (
          <div className="space-y-3">
            {requiredTypes.map((type) => {
              const latestDocument = getLatestDocumentByType(type);
              const status = latestDocument ? latestDocument.status : "missing";
              const isUploading = uploadingType === type;

              return (
                <div
                  key={type}
                  className={`rounded-xl border p-4 transition ${
                    status === "approved" ? "border-emerald-200 bg-emerald-50" :
                    status === "rejected" ? "border-red-200 bg-red-50"       :
                    status === "missing"  ? "border-dashed border-slate-200"  :
                                           "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-slate-900">{DOC_LABELS[type]}</span>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={status} />

                      {canReplace(status) && (
                        <>
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => inputRefs.current[type]?.click()}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                              status === "rejected"
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-orange-600 text-white hover:bg-orange-700"
                            }`}
                          >
                            {isUploading ? "Envoi…" : status === "missing" ? "Déposer" : "Remplacer"}
                          </button>
                          <input
                            ref={(element) => { inputRefs.current[type] = element; }}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) handleReplace(type, file);
                              event.target.value = "";
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {uploadErrors[type] && (
                    <p className="text-xs text-red-600 mt-2">{uploadErrors[type]}</p>
                  )}

                  {status === "rejected" && (
                    <p className="text-xs text-red-600 mt-2">
                      Document refusé — veuillez soumettre un nouveau fichier valide.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            {allApproved ? (
              <p className="text-sm text-emerald-700 font-semibold">✓ Tous vos documents ont été validés — compte actif.</p>
            ) : hasRejected ? (
              <p className="text-sm text-red-600 font-semibold">
                Certains documents ont été refusés. Cliquez sur <strong>Remplacer</strong> pour les soumettre à nouveau.
              </p>
            ) : allSubmitted ? (
              <p className="text-sm text-amber-700 font-semibold">
                Documents reçus — en cours de vérification par notre équipe.
              </p>
            ) : (
              <p className="text-sm text-slate-500">Des documents sont manquants — cliquez sur <strong>Déposer</strong>.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
