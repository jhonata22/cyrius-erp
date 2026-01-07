import { Package } from 'lucide-react'

export default function Inventario() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
      <div className="bg-gray-100 p-6 rounded-full mb-4">
        <Package size={48} />
      </div>
      <h2 className="text-xl font-bold text-gray-600">Módulo de Inventário</h2>
      <p>Em breve você poderá gerenciar máquinas e equipamentos aqui.</p>
    </div>
  )
}