"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import Header from "@/components/header"
import Toast from "@/components/toast"

export default function EmisorProfilePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyName: "",
    ruc: "",
    sector: "",
    country: "",
    description: "",
    website: "",
  })
  const [toast, setToast] = useState({ show: false, message: "", type: "success" as "success" | "error" })

  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 Enviando datos:', formData)

    if (!formData.companyName || !formData.ruc || !formData.sector || !formData.country) {
      alert("Por favor completa todos los campos requeridos.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/emisor/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ show: true, message: data.error || 'Error al guardar', type: 'error' })
        setIsLoading(false)
        return
      }

      if (data.profile) {
        localStorage.setItem('emisorProfile', JSON.stringify(data.profile))
      }

      setToast({ show: true, message: '¡Perfil de Emisor configurado! Redirigiendo a tu dashboard...', type: 'success' })
      setTimeout(() => {
        router.push('/emisor/dashboard')
      }, 2000)
    } catch (error) {
      setToast({ show: true, message: 'Error al guardar', type: 'error' })
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("userRole")
    localStorage.removeItem("emisorProfile")
    router.push("/auth/login")
  }

  return (
    <div className="h-screen bg-[#0D0D0D] text-white font-inter">
      <Header showLogout onLogout={handleLogout} />

      <main className="h-screen flex items-center justify-center pt-16">
        <div className="w-full max-w-lg px-6 py-10">
          <div className="bg-[#151515] rounded-xl p-8 shadow-lg border border-[#2A2A2A]">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Completa tu Perfil de Emisor</h1>
              <p className="text-gray-400">¡Bienvenido! Proporciona los detalles de tu empresa para continuar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="company-name" className="block text-sm font-medium text-gray-300">
                  Nombre de la Empresa Emisora
                </label>
                <input
                  type="text"
                  id="company-name"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent transition"
                  placeholder="Nombre Comercial S.A.C."
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="ruc" className="block text-sm font-medium text-gray-300">
                  RUC / Identificación Fiscal
                </label>
                <input
                  type="text"
                  id="ruc"
                  value={formData.ruc}
                  onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                  className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent transition"
                  placeholder="20123456789"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="sector" className="block text-sm font-medium text-gray-300">
                    Sector Industrial
                  </label>
                  <div className="relative">
                    <select
                      id="sector"
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent transition appearance-none"
                      required
                    >
                      <option value="" disabled>
                        Seleccionar sector
                      </option>
                      <option value="financiero">Financiero</option>
                      <option value="inmobiliario">Inmobiliario</option>
                      <option value="energia">Energía</option>
                      <option value="consumo">Consumo</option>
                      <option value="tecnologia">Tecnología</option>
                      <option value="industrial">Industrial</option>
                      <option value="otro">Otro</option>
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={16}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="country" className="block text-sm font-medium text-gray-300">
                    País de Operación
                  </label>
                  <div className="relative">
                    <select
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent transition appearance-none"
                      required
                    >
                      <option value="" disabled>
                        Seleccionar país
                      </option>
                      <option value="peru">Perú</option>
                      <option value="mexico">México</option>
                      <option value="colombia">Colombia</option>
                      <option value="chile">Chile</option>
                      <option value="argentina">Argentina</option>
                      <option value="brasil">Brasil</option>
                      <option value="espana">España</option>
                      <option value="usa">Estados Unidos</option>
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={16}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                  Breve Descripción de la Empresa <span className="text-gray-500">(Opcional)</span>
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent transition h-24 resize-none"
                  placeholder="Sobre nuestra empresa..."
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="website" className="block text-sm font-medium text-gray-300">
                  Sitio Web de la Empresa <span className="text-gray-500">(Opcional)</span>
                </label>
                <input
                  type="url"
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent transition"
                  placeholder="https://www.empresa.com"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#39FF14] text-black font-semibold rounded-lg transition duration-250 hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] disabled:opacity-50"                >
                  {isLoading ? 'Guardando...' : 'Finalizar Configuración'}
                </button>
              </div>
            </form>
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
