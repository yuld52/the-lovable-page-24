import { useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  /** Public URL to access the uploaded file */
  uploadURL: string;
  /** Path inside the bucket (e.g. public/123-file.png) */
  objectPath: string;
  metadata: UploadMetadata;
  /** Backwards-compatible alias */
  url: string;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook de upload usando API local (não requer Firebase Storage)
 */
export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        // Use local API endpoint for upload
        const formData = new FormData();
        formData.append("file", file);

        setProgress(30);
        const idToken = await getIdToken(user);
        
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${idToken}`
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Tenta obter a mensagem de erro específica do servidor
          const serverMessage = errorData.message || `Erro ${response.status}: Falha no upload`;
          throw new Error(serverMessage);
        }

        const data = await response.json();
        const publicUrl = data.url;

        if (!publicUrl) {
          throw new Error("URL pública não retornada pelo servidor");
        }

        const uploadResponse: UploadResponse = {
          uploadURL: publicUrl,
          objectPath: data.path || publicUrl,
          metadata: {
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          },
          url: publicUrl,
        };

        setProgress(100);
        options.onSuccess?.(uploadResponse);
        return uploadResponse;
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Upload failed");
        console.error("[useUpload] Erro:", e);
        setError(e);
        options.onError?.(e);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  /**
   * Mantido por compatibilidade com o ObjectUploader/Uppy.
   */
  const getUploadParameters = useCallback(async () => {
    throw new Error(
      "getUploadParameters não está disponível: use uploadFile(file)"
    );
  }, []);

  return {
    uploadFile,
    getUploadParameters,
    isUploading,
    error,
    progress,
  };
}