"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Download, Loader2 } from "lucide-react"

interface DownloadButtonProps {
  assetId: string
  fileName: string
  orderId: string
}

export function DownloadButton({ assetId, fileName, orderId }: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/downloads/${assetId}?orderId=${orderId}`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Download failed")
      }

      const data = await response.json()
      
      // Open download URL
      window.open(data.downloadUrl, "_blank")

      toast({
        title: "Download Started",
        description: "Your download should begin shortly.",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to start download",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={isLoading}
      className="w-full justify-start"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {fileName}
    </Button>
  )
}
