import * as React from 'react'
import { Avatar } from '../components/ui/avatar'
import { Card } from '../components/ui/card'
import { cn } from '../lib/cn'
import type { PostError as PostErrorType } from '../data/posts'

interface Props {
  error: PostErrorType
}

export const PostError: React.FC<Props> = ({ error }) => {
  return (
    <Card className="space-y-3 border-red-200 bg-red-50">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 text-2xl">
          ❌
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-red-600">Erreur</span>
                <span className="text-xs text-red-500">@system</span>
              </div>
            </div>
          </div>
          <div className={cn('mt-2 text-sm text-red-800')}>{error.message}</div>
        </div>
      </div>
    </Card>
  )
}

export default PostError