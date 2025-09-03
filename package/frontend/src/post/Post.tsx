import * as React from 'react'
import { Avatar } from '../components/ui/avatar'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { cn } from '../lib/cn'
import type { Post as PostType } from '../data/posts'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  post: PostType
}

export const Post: React.FC<Props> = ({ post }) => {
  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar name={post.author.name} src={post.author.avatar} size="xl" />
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{post.author.name}</span>
                <span className="text-xs text-slate-500">@{post.author.handle}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          <div className={cn('mt-2 text-sm text-slate-800')}>{post.content}</div>

          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <Button variant="ghost" size="sm">Reply ({post.replyCount ?? 0})</Button>
            <Button variant="ghost" size="sm">Repost ({post.repostCount ?? 0})</Button>
            <Button variant="ghost" size="sm">Like ({post.likeCount ?? 0})</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default Post
