import * as React from 'react'
import { cn } from '../../lib/cn'

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' // Ajout de la taille xl ici
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'xl', className, ...props }) => {
  const sizes: Record<string, string> = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg', // Nouvelle taille ajoutée
  }
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size], className)}
        {...props}
      />
    )
  }

  return (
    <div className={cn('rounded-full bg-slate-200 text-slate-700 flex items-center justify-center', sizes[size], className)}>
      {initials}
    </div>
  )
}

export default Avatar
