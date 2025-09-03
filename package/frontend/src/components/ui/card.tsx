import * as React from 'react'
import { cn } from '../../lib/cn'

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div className={cn('rounded-lg border bg-white shadow-sm p-4', className)} {...props}>
      {children}
    </div>
  )
}

export default Card

