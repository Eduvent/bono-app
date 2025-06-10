"use client"

import { LineChartIcon as ChartLine, Info, LogOut } from "lucide-react"

interface HeaderProps {
  showHelp?: boolean
  showLogout?: boolean
  onLogout?: () => void
}

export default function Header({ showHelp = true, showLogout = false, onLogout }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 w-full bg-black bg-opacity-75 backdrop-blur-md z-50 py-4">
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center">
          <ChartLine className="text-[#39FF14] text-2xl mr-2" size={24} />
          <span className="text-white text-xl font-semibold">BonoApp</span>
        </div>
        <div>
          {showHelp && (
            <button className="text-[#39FF14] hover:text-white transition duration-250 mr-4">
              <Info className="mr-1 inline" size={16} />
              Help
            </button>
          )}
          {showLogout && (
            <button onClick={onLogout} className="text-[#39FF14] hover:text-white transition duration-250">
              <LogOut className="mr-1 inline" size={16} />
              Salir
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
