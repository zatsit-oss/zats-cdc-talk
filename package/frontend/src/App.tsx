import React from 'react'
import Feed from './pages/Feed'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Le CDC pour ne pas DCD.</h1>
          <p className="text-sm text-slate-500">Pokésky.</p>
        </header>

        <Feed />
      </div>
    </div>
  )
}
