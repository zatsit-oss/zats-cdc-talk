import React, { useState } from 'react'
import { getRandomPokemon, pokemonPostPhrases } from '../lib/pokemon'

interface CreatePostProps {
  onCreate: (content: string, selectedPokemon: { name: string; handle: string; avatar: string }) => void
}

export const CreatePost: React.FC<CreatePostProps> = ({ onCreate }) => {
  const [newPostContent, setNewPostContent] = useState(
    pokemonPostPhrases[Math.floor(Math.random() * pokemonPostPhrases.length)]
  )
  const [selectedPokemon, setSelectedPokemon] = useState(getRandomPokemon())
  const pokemons = [
    {
      name: 'Pikachu',
      handle: 'pikachu',
      avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    },
    {
      name: 'Salamèche',
      handle: 'salameche',
      avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
    },
    {
      name: 'Bulbizarre',
      handle: 'bulbizarre',
      avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
    },
    {
      name: 'Carapuce',
      handle: 'carapuce',
      avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
    },
    {
      name: 'Rondoudou',
      handle: 'rondoudou',
      avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png',
    },
  ]

  const handleRandomPhrase = () => {
    const randomPhrase = pokemonPostPhrases[Math.floor(Math.random() * pokemonPostPhrases.length)]
    setNewPostContent(randomPhrase)
  }

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return
    onCreate(newPostContent, selectedPokemon)
    const randomPhrase = pokemonPostPhrases[Math.floor(Math.random() * pokemonPostPhrases.length)]
    setNewPostContent(randomPhrase)
  }

  return (
    <section className="mb-6">
      <div className="flex items-center gap-4 mb-4">
        <select
          value={selectedPokemon.name}
          onChange={(e) => {
            const pokemon = pokemons.find((p) => p.name === e.target.value)
            if (pokemon) setSelectedPokemon(pokemon)
          }}
          className="p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {pokemons.map((pokemon) => (
            <option key={pokemon.name} value={pokemon.name}>
              {pokemon.name}
            </option>
          ))}
        </select>
        <img
          src={selectedPokemon.avatar}
          alt={selectedPokemon.name}
          className="w-12 h-12 rounded-full"
        />
      </div>
      <textarea
        value={newPostContent}
        onChange={(e) => setNewPostContent(e.target.value)}
        placeholder="Quoi de neuf ?"
        className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleRandomPhrase}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Changer la phrase
        </button>
        <button
          onClick={handleCreatePost}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Publier
        </button>
      </div>
    </section>
  )
}

export default CreatePost
