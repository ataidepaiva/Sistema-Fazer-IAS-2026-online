"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const registrar = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js")
      } catch {
        // Registro offline opcional; falha não deve quebrar a aplicação.
      }
    }

    void registrar()
  }, [])

  return null
}
