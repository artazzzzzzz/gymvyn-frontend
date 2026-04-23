import BottomNav from '../components/BottomNav'
import { Users } from 'lucide-react'

export default function Community() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-20">
      <header className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Community</h1>
        <p className="text-zinc-500 text-sm mt-1">Connect with other athletes</p>
      </header>
      <div className="flex flex-col items-center justify-center px-5 py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <Users size={28} className="text-zinc-600" />
        </div>
        <p className="text-zinc-400 text-sm text-center">Community features coming soon</p>
      </div>
      <BottomNav />
    </div>
  )
}
