"use client"

import { useSyncExternalStore } from "react"
import type { DraftId, DraftMetaEntry, FeatureDraft } from "../model/specTypes"
import {
  createDraft as createDraftAction,
  deleteDraft as deleteDraftAction,
  exportDraftJson as exportDraftJsonAction,
  getLastWriteError,
  getServerSnapshot,
  getSnapshot,
  importDraftJson as importDraftJsonAction,
  renameDraft as renameDraftAction,
  selectDraft as selectDraftAction,
  setActiveDraft as setActiveDraftAction,
  subscribe
} from "../persistence/draftStore"

export type DraftListEntry = {
  id: DraftId
  draft: FeatureDraft
  meta: DraftMetaEntry
}

export type UseDraftStoreValue = {
  activeDraftId: DraftId | null
  activeDraft: FeatureDraft | null
  drafts: ReadonlyArray<DraftListEntry>
  lastWriteError: Error | null

  createDraft(locale?: FeatureDraft["metadata"]["locale"]): DraftId
  selectDraft(id: DraftId): void
  setActiveDraft(next: FeatureDraft): void
  renameDraft(id: DraftId, title: string): void
  deleteDraft(id: DraftId): void
  importDraftJson(raw: string): DraftId
  exportDraftJson(id: DraftId): string
}

export function useDraftStore(): UseDraftStoreValue {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const lastWriteError = useSyncExternalStore(subscribe, getLastWriteError, () => null)

  const drafts: DraftListEntry[] = Object.keys(state.drafts).map((id) => ({
    id,
    draft: state.drafts[id],
    meta: state.meta[id]
  }))

  const activeDraft = state.activeDraftId != null ? state.drafts[state.activeDraftId] ?? null : null

  return {
    activeDraftId: state.activeDraftId,
    activeDraft,
    drafts,
    lastWriteError,
    createDraft: createDraftAction,
    selectDraft: selectDraftAction,
    setActiveDraft: setActiveDraftAction,
    renameDraft: renameDraftAction,
    deleteDraft: deleteDraftAction,
    importDraftJson: importDraftJsonAction,
    exportDraftJson: exportDraftJsonAction
  }
}
