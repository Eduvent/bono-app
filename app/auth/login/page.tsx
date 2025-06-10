"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, LineChartIcon as ChartLine } from "lucide-react"
import Header from "@/components/header"
import Toast from "@/components/toast"

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState({ show: false, message: "", type: "success" as "success" | "error" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setToast({ show: true, message: "Please enter both email and password", type: "error" })
      return
    }

    setIsLoading(true)

    // Simulate login
    setTimeout(() => {
      setToast({ show: true, message: "Login successful! Redirecting...", type: "success" })
      setTimeout(() => {
        // Check if user has a role, if not go to role selection
        const userRole = localStorage.getItem("userRole")
        if (userRole) {
          router.push(userRole === "emisor" ? "/emisor/dashboard" : "/inversionista/dashboard")
        } else {
          router.push("/auth/role-selection")
        }
      }, 1500)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-inter">
      <Header />

      <main className="min-h-screen flex items-center justify-center py-12 px-4 pt-20">
        <div className="w-full max-w-md bg-[#1E1E1E] rounded-lg shadow-[0_0_12px_rgba(0,0,0,0.67)] p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6 bg-black bg-opacity-30 p-4 rounded-full">
              <ChartLine className="text-[#39FF14]" size={32} />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Welcome to BonoApp</h1>
            <p className="text-gray-400 text-center">Sign in to access your financial analytics dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-gray-300 font-medium">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition duration-250"
                  placeholder="name@company.com"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Mail className="text-gray-500" size={16} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-gray-300 font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition duration-250"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition duration-250"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="w-4 h-4 bg-[#0D0D0D] border border-[#2A2A2A] rounded focus:ring-[#39FF14] text-[#39FF14]"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-300">
                  Remember me
                </label>
              </div>
              <span className="text-sm text-[#39FF14] hover:text-white hover:underline transition duration-250 cursor-pointer">
                Forgot your password?
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#39FF14] text-black font-semibold rounded-lg hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition duration-250 flex justify-center items-center disabled:opacity-50"
            >
              {isLoading ? "Logging in..." : "Log In"}
            </button>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-400">
                ¿No tienes una cuenta?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/register")}
                  className="font-medium text-[#39FF14] hover:text-white hover:underline transition duration-250"
                >
                  Regístrate ahora
                </button>
              </p>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-[#2A2A2A] text-center">
            <p className="text-gray-400 text-sm">
              By signing in, you agree to our{" "}
              <span className="text-[#39FF14] hover:text-white hover:underline transition duration-250 cursor-pointer">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-[#39FF14] hover:text-white hover:underline transition duration-250 cursor-pointer">
                Privacy Policy
              </span>
            </p>
          </div>
        </div>
      </main>

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, show: false })}
      />
    </div>
  )
}
