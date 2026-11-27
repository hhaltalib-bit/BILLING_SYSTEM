'use client'

import { useCallback, useSyncExternalStore } from 'react'

// App-wide toast store (one toast at a time). Any component can call
// showUndoToast(); <UndoToastHost /> in the dashboard layout renders it,
// so adds made from the Topbar get an Undo too, not only the Transactions page.

export interface ToastState {
  id: number
  message: string
  /** omitted → info toast without an Undo button */
  onUndo?: () => void | Promise<void>
}

let current: ToastState | null = null
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function showUndoToast(message: string, onUndo?: ToastState['onUndo']) {
  current = { id: nextId++, message, onUndo }
  emit()
}

export function dismissUndoToast(id?: number) {
  if (id !== undefined && current?.id !== id) return   // a newer toast replaced it
  current = null
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function useUndoToast() {
  const toast = useSyncExternalStore(subscribe, () => current, () => null)
  const show = useCallback((message: string, onUndo?: ToastState['onUndo']) => showUndoToast(message, onUndo), [])
  const dismiss = useCallback(() => dismissUndoToast(), [])
  return { toast, show, dismiss }
}
