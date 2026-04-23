import BottomNav from '../components/BottomNav'
import { Apple } from 'lucide-react'

export default function Diet() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-20">
      <header className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Diet</h1>
        <p className="text-zinc-500 text-sm mt-1">Nutrition & meal tracking</p>
      </header>
      <div className="flex flex-col items-center justify-center px-5 py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <Apple size={28} className="text-zinc-600" />
        </div>
        <p className="text-zinc-400 text-sm text-center">Diet tracking coming soon</p>
      </div>
      <BottomNav />
    </div>
  )
}
