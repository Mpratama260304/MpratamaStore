"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { 
  Scroll, 
  Bot, 
  Brain, 
  BookOpen, 
  Palette, 
  Package 
} from "lucide-react"

const categoryIcons: Record<string, React.ElementType> = {
  script: Scroll,
  bot: Bot,
  ai: Brain,
  ebook: BookOpen,
  asset: Palette,
}

interface ProductImageProps {
  src?: string | null
  alt: string
  category?: string | null
  className?: string
  fill?: boolean
  width?: number
  height?: number
  priority?: boolean
  sizes?: string
}

export function ProductImage({
  src,
  alt,
  category,
  className,
  fill = false,
  width,
  height,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const IconComponent = category ? categoryIcons[category] || Package : Package
  
  // Show placeholder if no src or if there was an error
  if (!src || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50",
          className
        )}
      >
        <IconComponent className="h-12 w-12 text-muted-foreground opacity-50" />
      </div>
    )
  }

  // Handle external URLs vs local paths
  const isExternal = src.startsWith("http://") || src.startsWith("https://")
  
  // Common props for both Image variants
  const commonProps = {
    src,
    alt,
    priority,
    onError: () => setHasError(true),
    onLoad: () => setIsLoading(false),
    className: cn(
      "object-cover transition-opacity duration-300",
      isLoading ? "opacity-0" : "opacity-100",
      className
    ),
  }

  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50", className)}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full bg-purple-500/20" />
        </div>
      )}
      
      {fill ? (
        <Image
          {...commonProps}
          fill
          sizes={sizes}
          unoptimized={isExternal}
        />
      ) : (
        <Image
          {...commonProps}
          width={width || 400}
          height={height || 400}
          sizes={sizes}
          unoptimized={isExternal}
        />
      )}
    </div>
  )
}
