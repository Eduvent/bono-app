"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import Header from "@/components/header"
import Toast from "@/components/toast"

export default function InversionistaProfilePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    investorType: "",
    currency: "",
    interests: [] as string[],
  })
  const [toast, setToast] = useState({ show: false, message: "", type: "success" as "success" | "error" })
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const handleInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, interests: [...formData.interests, interest] })
    } else {
      setFormData({ ...formData, interests: formData.interests.filter((i) => i !== interest) })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, boolean> = {}

    if (!formData.name) {
      newErrors.name = true
    }
    if (!formData.country) {
      newErrors.country = true
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    // Save data to localStorage
    localStorage.setItem("inversionistaProfile", JSON.stringify(formData))

    // Show success toast
    setToast({ show: true, message: "¡Perfil de Inversionista listo! Redirigiendo a tu dashboard...", type: "success" })

    // Redirect after delay
    setTimeout(() => {
      router.push("/inversionista/dashboard")
    }, 2000)
  }

  return (
    <div className="h-screen bg-[#0D0D0D] text-white font-inter">
      <Header />

      <main className="h-screen flex items-center justify-center pt-16">
        <div className="w-full max-w-md px-6 py-8 flex flex-col">
          <div className="bg-[#151515] rounded-xl border border-[#2A2A2A] p-6 shadow-lg">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Completa tu Perfil de Inversionista</h1>
              <p className="text-gray-400">¡Hola! Ayúdanos a conocerte un poco mejor.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label htmlFor="investor-name" className="block text-sm font-medium mb-1">
                  Nombre Preferido / Alias <span className="text-[#39FF14]">*</span>
                </label>
                <input
                  type="text"
                  id="investor-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full bg-[#1E1E1E] border ${errors.name ? "border-red-500" : "border-[#2A2A2A]"} rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent`}
                  placeholder="Mi Portafolio Principal"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="country" className="block text-sm font-medium mb-1">
                  País de Residencia <span className="text-[#39FF14]">*</span>
                </label>
                <div className="relative">
                  <select
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className={`w-full bg-[#1E1E1E] border ${errors.country ? "border-red-500" : "border-[#2A2A2A]"} rounded-lg px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent`}
                    required
                  >
                    <option value="" disabled>
                      Selecciona tu país
                    </option>
                    <option value="AR">Argentina</option>
                    <option value="BO">Bolivia</option>
                    <option value="CL">Chile</option>
                    <option value="CO">Colombia</option>
                    <option value="CR">Costa Rica</option>
                    <option value="EC">Ecuador</option>
                    <option value="SV">El Salvador</option>
                    <option value="GT">Guatemala</option>
                    <option value="HN">Honduras</option>
                    <option value="MX">México</option>
                    <option value="NI">Nicaragua</option>
                    <option value="PA">Panamá</option>
                    <option value="PY">Paraguay</option>
                    <option value="PE">Perú</option>
                    <option value="ES">España</option>
                    <option value="UY">Uruguay</option>
                    <option value="VE">Venezuela</option>
                    <option value="US">Estados Unidos</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="investor-type" className="block text-sm font-medium mb-1">
                  Tipo de Inversionista <span className="text-gray-500">(Opcional)</span>
                </label>
                <div className="relative">
                  <select
                    id="investor-type"
                    value={formData.investorType}
                    onChange={(e) => setFormData({ ...formData, investorType: e.target.value })}
                    className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
                  >
                    <option value="" disabled>
                      Selecciona el tipo
                    </option>
                    <option value="individual">Individual</option>
                    <option value="institutional">Institucional</option>
                    <option value="advisor">Asesor</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="preferred-currency" className="block text-sm font-medium mb-1">
                  Moneda Preferida <span className="text-gray-500">(Opcional)</span>
                </label>
                <div className="relative">
                  <select
                    id="preferred-currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
                  >
                    <option value="" disabled>
                      Selecciona moneda
                    </option>
                    <option value="USD">USD - Dólar Estadounidense</option>
                    <option value="PEN">PEN - Sol Peruano</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="COP">COP - Peso Colombiano</option>
                    <option value="ARS">ARS - Peso Argentino</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-2">
                  Áreas de Interés <span className="text-gray-500">(Opcional)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "corporate", label: "Corporativos" },
                    { id: "government", label: "Gubernamentales" },
                    { id: "high-yield", label: "Alto Rendimiento" },
                    { id: "short-term", label: "Corto Plazo" },
                    { id: "long-term", label: "Largo Plazo" },
                    { id: "green-bonds", label: "Bonos Verdes" },
                  ].map((interest) => (
                    <div key={interest.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={interest.id}
                        checked={formData.interests.includes(interest.id)}
                        onChange={(e) => handleInterestChange(interest.id, e.target.checked)}
                        className="mr-2 h-4 w-4 accent-[#39FF14]"
                      />
                      <label htmlFor={interest.id} className="text-sm">
                        {interest.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#39FF14] text-black font-semibold rounded-lg transition duration-250 hover:shadow-[0_0_15px_rgba(57,255,20,0.5)]"
                >
                  Empezar a Invertir
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
