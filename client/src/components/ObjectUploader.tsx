import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters?: (file: any) => Promise<{ method: "PUT"; url: string; headers?: Record<string, string> }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName}>
        {children}
      </Button>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Upload de Arquivo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Selecione um arquivo para upload. O arquivo será processado localmente.
            </p>
            <input
              type="file"
              className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onComplete) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    onComplete({
                      successful: [{
                        uploadURL: reader.result as string,
                        name: file.name,
                        size: file.size,
                      }]
                    });
                  };
                  reader.readAsDataURL(file);
                }
                setShowModal(false);
              }}
            />
            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}