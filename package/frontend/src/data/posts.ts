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

export const posts: Post[] = [
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
