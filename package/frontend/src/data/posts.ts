export type Post = {
  id: string
  author: {
    name: string
    handle: string
    avatar?: string
  }
  content: string
  createdAt: string
  likeCount?: number
  replyCount?: number
  repostCount?: number
}

export type PostError = {
  message: string
}

/**
 * Mapper qui transforme les données reçues du backend vers une entité Post
 * @param backendData Structure reçue du backend
 * @returns Entité Post formatée pour le frontend
 */
export const mapBackendDataToPost = (backendData: {
  id: string;
  authorName: string;
  authorHandle: string;
  content: string;
  createdAt: string;
}): Post => {
  // Récupérer l'avatar en fonction du handle du Pokémon
  const getPokemonAvatar = (handle: string): string => {
    const pokemonIds: Record<string, string> = {
      pikachu: '25',
      salameche: '4',
      bulbizarre: '1',
      carapuce: '7',
      rondoudou: '39'
    };

    const id = pokemonIds[handle] || '25'; // Défaut sur Pikachu si handle inconnu
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  };

  // Génère un nombre aléatoire entre 0 et 10 inclus
  const getRandomCount = (): number => {
    return Math.floor(Math.random() * 11); // 0 à 10 inclus
  };

  return {
    id: backendData.id,
    author: {
      name: backendData.authorName,
      handle: backendData.authorHandle,
      avatar: getPokemonAvatar(backendData.authorHandle)
    },
    content: backendData.content,
    createdAt: backendData.createdAt,
    likeCount: getRandomCount(),
    replyCount: getRandomCount(),
    repostCount: getRandomCount()
  };
};

export const posts: (Post | PostError)[] = [
  {
    message: "Ohoh",
  },
  {
    id: '1',
    author: { name: 'Pikachu', handle: 'pikachu', avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
    content: "Découvert un super café près du canal aujourd'hui ☕️ #coffee #paris",
    createdAt: '2025-09-02T10:12:00Z',
    likeCount: 12,
    replyCount: 3,
    repostCount: 1,
  },
  {
    id: '2',
    author: { name: 'Salamèche', handle: 'salameche', avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png' },
    content: "J'ai codé un petit outil pour visualiser mes notes. Très satisfait du résultat!",
    createdAt: '2025-09-02T08:45:00Z',
    likeCount: 7,
    replyCount: 1,
    repostCount: 0,
  },
  {
    id: '3',
    author: { name: 'Bulbizarre', handle: 'bulbizarre', avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png' },
    content: "Quelqu'un a des recommandations de podcasts sur l'IA ? 🎧",
    createdAt: '2025-09-01T20:03:00Z',
    likeCount: 20,
    replyCount: 5,
    repostCount: 2,
  },
  {
    id: '4',
    author: { name: 'Carapuce', handle: 'carapuce', avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png' },
    content: "Release: v1.3.0 deployed. Changelog: bugfixes, perf improvements.",
    createdAt: '2025-08-31T16:00:00Z',
    likeCount: 3,
    replyCount: 0,
    repostCount: 0,
  },
]
