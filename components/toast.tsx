"use client"

import { CheckCircle, AlertCircle } from "lucide-react"
import { useEffect } from "react"

interface ToastProps {
  message: string
  type?: "success" | "error"
  show: boolean
  onHide: () => void
}

export default function Toast({ message, type = "success", show, onHide }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onHide])

  if (!show) return null

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div
        className={`bg-[#1E1E1E] border-l-4 ${type === "error" ? "border-red-500" : "border-[#39FF14]"} text-white px-6 py-4 rounded-lg shadow-lg flex items-center`}
      >
        {type === "error" ? (
          <AlertCircle className="text-red-500 mr-3" size={20} />
        ) : (
          <CheckCircle className="text-[#39FF14] mr-3" size={20} />
        )}
        <p>{message}</p>
      </div>
    </div>
  )
}
