import { useState, useCallback } from "react";

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  metadata: { name: string; size: number; contentType: string };
  url: string;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

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
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            setProgress(100);
            const uploadResponse: UploadResponse = {
              uploadURL: reader.result as string,
              objectPath: `local/${Date.now()}-${file.name}`,
              metadata: {
                name: file.name,
                size: file.size,
                contentType: file.type || "application/octet-stream",
              },
              url: reader.result as string,
            };
            options.onSuccess?.(uploadResponse);
            setIsUploading(false);
            resolve(uploadResponse);
          };
          reader.onerror = () => {
            const e = new Error("Falha ao ler arquivo");
            setError(e);
            options.onError?.(e);
            setIsUploading(false);
            reject(e);
          };
          setProgress(50);
          reader.readAsDataURL(file);
        });
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Upload failed");
        setError(e);
        options.onError?.(e);
        setIsUploading(false);
        return null;
      }
    },
    [options]
  );

  const getUploadParameters = useCallback(async () => {
    throw new Error("getUploadParameters not available: use uploadFile(file)");
  }, []);

  return {
    uploadFile,
    getUploadParameters,
    isUploading,
    error,
    progress,
  };
}