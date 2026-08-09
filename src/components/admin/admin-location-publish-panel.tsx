"use client";

import { LocationPublishForm } from "@/components/location/location-publish-form";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/context/app-state-context";
import {
  buildManagedLocationListing,
  EMPTY_LOCATION_PUBLISH_FORM,
  locationToPublishForm,
  validateLocationPublishForm,
  type LocationPublishFormData,
} from "@/lib/location-publish-form";
import {
  getManagedListingStatus,
  type ManagedLocationListing,
} from "@/types/admin";
import type { Location } from "@/types/location";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";

interface AdminLocationPublishPanelProps {
  onMessage: (message: string) => void;
}

export function AdminLocationPublishPanel({
  onMessage,
}: AdminLocationPublishPanelProps) {
  const {
    currentUser,
    managedListings,
    upsertManagedListing,
    removeManagedListing,
    setManagedListingStatus,
  } = useAppState();
  const [form, setForm] = useState<LocationPublishFormData>(() =>
    EMPTY_LOCATION_PUBLISH_FORM(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const locationListings = useMemo(
    () =>
      managedListings.filter(
        (listing): listing is ManagedLocationListing =>
          listing.category === "locali",
      ),
    [managedListings],
  );

  const pendingCount = locationListings.filter(
    (listing) => getManagedListingStatus(listing) === "pending_review",
  ).length;

  function resetForm() {
    setForm(EMPTY_LOCATION_PUBLISH_FORM());
    setEditingId(null);
    setConfirmPublish(false);
    setFormError(null);
  }

  function save(status: "draft" | "published") {
    const error = validateLocationPublishForm(form);
    if (error) {
      setFormError(error);
      setConfirmPublish(false);
      return;
    }

    if (status === "published" && !confirmPublish) {
      setConfirmPublish(true);
      setFormError(null);
      return;
    }

    const listing = buildManagedLocationListing({
      form,
      status,
      source: "admin",
      submitterEmail: currentUser.email,
      existingId: editingId ?? undefined,
    });
    upsertManagedListing(listing);
    resetForm();
    onMessage(
      status === "published"
        ? "Location pubblicata in Esplora."
        : "Bozza location salvata.",
    );
  }

  function loadListing(listing: ManagedLocationListing) {
    setForm(locationToPublishForm(listing.location));
    setEditingId(listing.id);
    setConfirmPublish(false);
    setFormError(null);
    onMessage(`Modifica caricata: ${listing.location.name}`);
  }

  async function importWithAi(files?: FileList | null) {
    setAiLoading(true);
    setFormError(null);
    try {
      const formData = new FormData();
      if (aiText.trim()) formData.append("text", aiText);
      Array.from(files ?? []).forEach((file) => {
        formData.append(
          file.type.startsWith("image/") ? "photos" : "files",
          file,
        );
      });

      const response = await fetch("/api/ai/location-extract", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Import non riuscito");

      const body = (await response.json()) as {
        data?: { location?: Location };
      };
      const location = body.data?.location;
      if (!location) throw new Error("Nessun dettaglio estratto");

      setForm(locationToPublishForm(location));
      setEditingId(null);
      onMessage("Dettagli importati: controlla e pubblica quando sei pronto.");
    } catch {
      setFormError("Import IA non riuscito. Controlla testo/file e riprova.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-primary-black/10 bg-primary-black/[0.02] p-4">
        <h2 className="text-base font-black text-primary-black">
          Configura e pubblica location
        </h2>
        <p className="mt-1 text-xs text-primary-black/55">
          Stessi campi della scheda evento/location. Con «Pubblica» chiediamo
          conferma prima di metterla live in Esplora.
          {pendingCount > 0
            ? ` Hai ${pendingCount} annunci business in revisione sotto.`
            : ""}
        </p>
      </div>

      <div className="rounded-3xl border border-primary-black/10 bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-teal/15 text-brand-teal">
            <Wand2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-primary-black">
              Import assistito IA
            </p>
            <p className="mt-1 text-xs text-primary-black/55">
              Opzionale: incolla mail/listino o carica screenshot, poi rivedi i
              campi.
            </p>
            <textarea
              value={aiText}
              onChange={(event) => setAiText(event.target.value)}
              rows={3}
              placeholder="Incolla testo o dettagli del locale..."
              className="mt-3 w-full rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm outline-none focus:border-brand-teal"
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <label className="flex flex-1 cursor-pointer items-center justify-center rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm font-bold text-primary-black/70">
                Carica file
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.csv,.md"
                  className="sr-only"
                  onChange={(event) => void importWithAi(event.target.files)}
                />
              </label>
              <Button
                className="flex-1 rounded-2xl"
                disabled={aiLoading}
                onClick={() => void importWithAi()}
              >
                {aiLoading ? "Analisi..." : "Apprendi dettagli"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-primary-black/10 bg-surface p-4">
        <LocationPublishForm value={form} onChange={setForm} idPrefix="admin" />

        {formError && (
          <p className="mt-4 rounded-2xl bg-brand-pink/15 px-3 py-2 text-xs font-semibold text-primary-black">
            {formError}
          </p>
        )}

        {confirmPublish && (
          <div className="mt-4 rounded-2xl border border-brand-teal/30 bg-brand-teal/10 p-3">
            <p className="text-sm font-bold text-primary-black">
              Confermi la pubblicazione in Esplora?
            </p>
            <p className="mt-1 text-xs text-primary-black/60">
              La location sarà visibile agli utenti con il prezzo indicato.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1 rounded-2xl"
                onClick={() => save("published")}
              >
                Sì, pubblica
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => setConfirmPublish(false)}
              >
                Annulla
              </Button>
            </div>
          </div>
        )}

        {!confirmPublish && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={() => save("draft")}
            >
              Salva bozza
            </Button>
            <Button
              className="flex-1 rounded-2xl"
              onClick={() => save("published")}
            >
              Pubblica
            </Button>
          </div>
        )}

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="mt-3 w-full text-center text-xs font-semibold text-primary-black/50 underline-offset-2 hover:underline"
          >
            Annulla modifica e svuota form
          </button>
        )}
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-black text-primary-black">
            Le tue pubblicazioni locali ({locationListings.length})
          </h3>
          <p className="mt-1 text-xs font-semibold text-primary-black/55">
            Memoria delle location create: tocca Modifica per aggiornarle quando
            vuoi.
          </p>
        </div>
        {locationListings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-primary-black/15 px-4 py-6 text-center text-sm text-primary-black/50">
            Nessuna location salvata. Pubblicane una qui sopra: resterà in
            elenco per modifiche future.
          </p>
        ) : (
          locationListings.map((listing) => {
            const status = getManagedListingStatus(listing);
            return (
              <article
                key={listing.id}
                className="rounded-3xl border border-primary-black/10 bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-primary-black">
                      {listing.location.name}
                    </p>
                    <p className="mt-0.5 text-xs text-primary-black/55">
                      {listing.location.address}
                      {listing.source === "business"
                        ? ` · da ${listing.submitterEmail ?? "business"}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadListing(listing)}
                    className="rounded-full bg-primary-black/5 px-3 py-1.5 text-xs font-bold text-primary-black"
                  >
                    Modifica
                  </button>
                  {status === "pending_review" && (
                    <button
                      type="button"
                      onClick={() => {
                        setManagedListingStatus(listing.id, "published");
                        onMessage("Annuncio business approvato e pubblicato.");
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-teal px-3 py-1.5 text-xs font-bold text-ink-inverse"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Approva
                    </button>
                  )}
                  {status === "published" ? (
                    <button
                      type="button"
                      onClick={() =>
                        setManagedListingStatus(listing.id, "draft")
                      }
                      className="inline-flex items-center gap-1 rounded-full bg-primary-black/5 px-3 py-1.5 text-xs font-bold text-primary-black"
                    >
                      <EyeOff className="h-3.5 w-3.5" aria-hidden />
                      Togli pubblicazione
                    </button>
                  ) : status !== "pending_review" ? (
                    <button
                      type="button"
                      onClick={() =>
                        setManagedListingStatus(listing.id, "published")
                      }
                      className="inline-flex items-center gap-1 rounded-full bg-brand-teal/15 px-3 py-1.5 text-xs font-bold text-brand-teal"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                      Pubblica
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setManagedListingStatus(listing.id, "draft")
                      }
                      className="rounded-full bg-primary-black/5 px-3 py-1.5 text-xs font-bold text-primary-black"
                    >
                      Rifiuta (bozza)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const name = listing.location.name;
                      const confirmed = window.confirm(
                        `Eliminare la pubblicazione di “${name}”? Verrà rimossa da Esplora e dal catalogo.`,
                      );
                      if (!confirmed) return;
                      removeManagedListing(listing.id);
                      if (editingId === listing.id) resetForm();
                      onMessage(`Pubblicazione di “${name}” eliminata.`);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-pink/30 bg-brand-pink/15 px-3 py-1.5 text-xs font-bold text-brand-pink"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Elimina
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "draft" | "pending_review" | "published";
}) {
  if (status === "published") {
    return (
      <span className="rounded-full bg-brand-teal/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-brand-teal">
        Live
      </span>
    );
  }
  if (status === "pending_review") {
    return (
      <span className="rounded-full bg-amber-400/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">
        In revisione
      </span>
    );
  }
  return (
    <span className="rounded-full bg-primary-black/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-primary-black/55">
      Bozza
    </span>
  );
}
