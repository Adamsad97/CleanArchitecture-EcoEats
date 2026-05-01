"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { getStoredAccessToken } from "../../auth/services/tokenHelper";
import { connectSocket } from "../../auth/services/socketService";
import {
  getDocumentsByStatus,
  approveDocument,
  rejectDocument,
} from "../../auth/services/adminDocumentService";
import type { AdminDocumentDto, DocumentStatusFilter } from "../../auth/services/adminDocumentService";
import { API_BASE } from "../../auth/services/http";
import type { ApiResult } from "../../auth/types";

const DOC_TYPE_LABELS: Record<string, string> = {
  kbis:                 "Extrait Kbis",
  id_card:              "Pièce d'identité",
  driving_license:      "Permis de conduire",
  vehicle_insurance:    "Assurance véhicule",
  vehicle_registration: "Carte grise",
  food_hygiene:         "Attestation d'hygiène",
};

const TABS: { label: string; value: DocumentStatusFilter; color: string }[] = [
  { label: "En attente",  value: "pending",  color: "text-amber-700" },
  { label: "Validés",     value: "approved", color: "text-emerald-700" },
  { label: "Refusés",     value: "rejected", color: "text-red-700" },
];

type UserGroup = {
  ownerName:  string;
  ownerEmail: string;
  documents:  AdminDocumentDto[];
};

function groupByOwner(documents: AdminDocumentDto[]): UserGroup[] {
  const map = new Map<string, UserGroup>();
  for (const document of documents) {
    const existing = map.get(document.ownerEmail);
    if (existing) {
      existing.documents.push(document);
    } else {
      map.set(document.ownerEmail, {
        ownerName:  document.ownerName,
        ownerEmail: document.ownerEmail,
        documents:  [document],
      });
    }
  }
  return [...map.values()];
}

function DocumentRow({
  document,
  activeTab,
  actionId,
  onApprove,
  onReject,
}: {
  document:  AdminDocumentDto;
  activeTab: DocumentStatusFilter;
  actionId:  string | null;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
}) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 ${
      activeTab === "pending"  ? "bg-amber-50"   :
      activeTab === "approved" ? "bg-emerald-50" : "bg-red-50"
    }`}>
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {DOC_TYPE_LABELS[document.type] ?? document.type}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Déposé le {new Date(document.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`${API_BASE}/${document.filePath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          👁 Voir
        </a>

        {activeTab === "pending" && (
          <>
            <button
              type="button"
              onClick={() => onApprove(document.id)}
              disabled={actionId === document.id}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {actionId === document.id ? "…" : "✓ Valider"}
            </button>
            <button
              type="button"
              onClick={() => onReject(document.id)}
              disabled={actionId === document.id}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition"
            >
              {actionId === document.id ? "…" : "✕ Refuser"}
            </button>
          </>
        )}

        {activeTab === "approved" && (
          <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1">✓ Validé</span>
        )}
        {activeTab === "rejected" && (
          <span className="rounded-full bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1">✕ Refusé</span>
        )}
      </div>
    </div>
  );
}

function UserDocumentCard({
  group,
  activeTab,
  actionId,
  onApprove,
  onReject,
}: {
  group:     UserGroup;
  activeTab: DocumentStatusFilter;
  actionId:  string | null;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-black text-orange-600">
              {group.ownerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{group.ownerName}</p>
            <p className="text-xs text-slate-400">{group.ownerEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="rounded-full bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1">
            {group.documents.length} document{group.documents.length > 1 ? "s" : ""}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {group.documents.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              activeTab={activeTab}
              actionId={actionId}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDocumentsPage() {
  const { tokens } = useAuth();

  const [activeTab,  setActiveTab]  = useState<DocumentStatusFilter>("pending");
  const [documents,  setDocuments]  = useState<AdminDocumentDto[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [actionId,   setActionId]   = useState<string | null>(null);
  const [pageError,  setPageError]  = useState<string | null>(null);

  const executeWithRefresh = useCallback(async <T,>(
    request: (accessToken: string) => Promise<ApiResult<T>>,
  ): Promise<ApiResult<T> | null> => {
    const token = tokens?.accessToken ?? null;
    if (!token) return null;
    return request(token);
  }, [tokens]);

  const loadDocumentsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      setLoading(true);
      if (!tokens?.accessToken) { if (isMounted) setLoading(false); return; }

      const result = await executeWithRefresh((token) => getDocumentsByStatus(activeTab, token));
      if (!isMounted) return;

      if (result?.ok) {
        setDocuments(result.data ?? []);
        setPageError(null);
      } else if (result?.status === 403) {
        setPageError("Accès refusé : ce compte n'est pas administrateur.");
      } else if (result) {
        setPageError(result.message ?? "Erreur de chargement");
      }
      setLoading(false);
    };

    loadDocumentsRef.current = () => { void loadDocuments(); };
    void loadDocuments();
    return () => { isMounted = false; };
  }, [activeTab, tokens, executeWithRefresh]);

  /* ── Temps réel : nouveau document déposé par un utilisateur ── */
  useEffect(() => {
    if (!tokens?.accessToken) return;

    const socket = connectSocket(tokens.accessToken);

    const handleNewDocument = () => {
      if (activeTab === "pending") {
        loadDocumentsRef.current?.();
      }
    };

    socket.on("document:new", handleNewDocument);
    return () => { socket.off("document:new", handleNewDocument); };
  }, [tokens?.accessToken, activeTab]);

  const removeDocument = (documentId: string) =>
    setDocuments((previous) => previous.filter((document) => document.id !== documentId));

  const handleApprove = async (documentId: string) => {
    setActionId(documentId);
    const result = await executeWithRefresh((token) => approveDocument(documentId, token));
    if (result?.ok) removeDocument(documentId);
    else setPageError(result?.message ?? "Erreur");
    setActionId(null);
  };

  const handleReject = async (documentId: string) => {
    setActionId(documentId);
    const result = await executeWithRefresh((token) => rejectDocument(documentId, token));
    if (result?.ok) removeDocument(documentId);
    else setPageError(result?.message ?? "Erreur");
    setActionId(null);
  };

  const groups = groupByOwner(documents);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Documents</h1>
        <p className="text-slate-500 text-sm mt-1">
          {groups.length} utilisateur{groups.length !== 1 ? "s" : ""}
          {" · "}
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === tab.value
                ? `bg-white shadow-sm ${tab.color}`
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {pageError && <p className="text-sm text-red-600 font-medium">{pageError}</p>}

      {loading ? (
        <p className="text-slate-400 text-sm">Chargement…</p>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <p className="text-3xl mb-3">
            {activeTab === "approved" ? "✓" : activeTab === "rejected" ? "✕" : "📭"}
          </p>
          <p className="text-slate-500 text-sm">Aucun document dans cet onglet.</p>
        </div>
      ) : (
        groups.map((group) => (
          <UserDocumentCard
            key={group.ownerEmail}
            group={group}
            activeTab={activeTab}
            actionId={actionId}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))
      )}
    </div>
  );
}
