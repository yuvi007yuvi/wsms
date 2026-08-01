"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  // Force auto-dismiss every toast after 5 seconds
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    toasts.forEach((t) => {
      if (t.open) {
        const timer = setTimeout(() => {
          dismiss(t.id)
        }, 5000)
        timers.push(timer)
      }
    })
    return () => {
      timers.forEach(clearTimeout)
    }
  }, [toasts, dismiss])

  return (
    <ToastProvider duration={5000} swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} duration={5000} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
