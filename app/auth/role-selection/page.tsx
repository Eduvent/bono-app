"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LineChartIcon as ChartLine, Factory } from "lucide-react"
import Header from "@/components/header"

export default function RoleSelectionPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  useEffect(() => {
    // Check if role was previously selected
    const savedRole = localStorage.getItem("userRole")
    if (savedRole) {
      setSelectedRole(savedRole)
    }
  }, [])

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role)
  }

  const handleContinue = () => {
    if (selectedRole) {
      localStorage.setItem("userRole", selectedRole)
      if (selectedRole === "emisor") {
        router.push("/auth/emisor-profile")
      } else {
        router.push("/auth/inversionista-profile")
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if (!selectedRole || selectedRole === "inversionista") {
        setSelectedRole("emisor")
      } else {
        setSelectedRole("inversionista")
      }
    } else if (event.key === "Enter" && selectedRole) {
      handleContinue()
    }
  }

  return (
    <div className="h-screen bg-[#0D0D0D] text-white font-inter" onKeyDown={handleKeyDown} tabIndex={0}>
      <Header />

      <main className="h-screen flex items-center justify-center pt-16">
        <div className="w-full max-w-xl px-6 flex flex-col items-center">
          <div className="mb-8 flex flex-col items-center">
            <div className="bg-black bg-opacity-30 p-4 rounded-full mb-4">
              <ChartLine className="text-[#39FF14]" size={32} />
            </div>
            <h1 className="text-2xl md:text-[24px] font-bold">Selecciona tu rol</h1>
          </div>

          <div className="w-full space-y-6 mb-10">
            <div
              onClick={() => handleRoleSelect("emisor")}
              className={`w-full h-[180px] bg-[#1E1E1E] border-2 ${
                selectedRole === "emisor"
                  ? "border-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.47)]"
                  : "border-[#2A2A2A]"
              } rounded-xl p-6 cursor-pointer transition duration-300 hover:scale-[1.02] flex flex-col justify-between`}
            >
              <div className="flex justify-between items-start">
                <div className="p-4 bg-black bg-opacity-30 rounded-full">
                  <Factory className="text-[#39FF14]" size={32} />
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-[#2A2A2A] flex items-center justify-center">
                  <div
                    className={`w-3 h-3 rounded-full bg-[#39FF14] ${selectedRole === "emisor" ? "block" : "hidden"}`}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Emisor</h3>
                <p className="text-[18px] leading-[24px] text-gray-400 font-medium">Crear y administrar bonos</p>
              </div>
            </div>

            <div
              onClick={() => handleRoleSelect("inversionista")}
              className={`w-full h-[180px] bg-[#1E1E1E] border-2 ${
                selectedRole === "inversionista"
                  ? "border-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.47)]"
                  : "border-[#2A2A2A]"
              } rounded-xl p-6 cursor-pointer transition duration-300 hover:scale-[1.02] flex flex-col justify-between`}
            >
              <div className="flex justify-between items-start">
                <div className="p-4 bg-black bg-opacity-30 rounded-full">
                  <ChartLine className="text-[#39FF14]" size={32} />
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-[#2A2A2A] flex items-center justify-center">
                  <div
                    className={`w-3 h-3 rounded-full bg-[#39FF14] ${selectedRole === "inversionista" ? "block" : "hidden"}`}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Inversionista</h3>
                <p className="text-[18px] leading-[24px] text-gray-400 font-medium">Comprar y analizar bonos</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            className={`w-full py-3 bg-[#39FF14] text-black font-semibold rounded-lg transition duration-250 flex justify-center items-center ${
              selectedRole ? "hover:shadow-[0_0_15px_rgba(57,255,20,0.5)]" : "bg-opacity-50 cursor-not-allowed"
            }`}
          >
            Continuar
          </button>
        </div>
      </main>
    </div>
  )
}
