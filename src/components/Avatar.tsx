
import React from 'react';
import { Avatar as ShadcnAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type AvatarProps = {
  src?: string;
  fallback: string;
  status?: 'online' | 'away' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const Avatar = ({ src, fallback, status, size = 'md', className }: AvatarProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const statusColors = {
    online: 'bg-green-400',
    away: 'bg-yellow-400',
    offline: 'bg-gray-400'
  };

  return (
    <div className={cn("relative", className)}>
      <ShadcnAvatar className={cn(sizeClasses[size], "ring-2 ring-background")}>
        <AvatarImage src={src || "/placeholder.svg"} />
        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
          {fallback}
        </AvatarFallback>
      </ShadcnAvatar>
      
      {status && (
        <span 
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background", 
            statusColors[status],
            size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-3.5 w-3.5'
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
