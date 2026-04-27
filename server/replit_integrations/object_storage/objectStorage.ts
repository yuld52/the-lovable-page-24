import { getStorage, ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { initializeApp, getApps } from "firebase-admin/app";
import { Response } from "express";
import { randomUUID } from "crypto";

// Firebase client configuration
const firebaseClientConfig = {
  apiKey: "AIzaSyD-j82onZcnjbqrxZ8l6O-SzWLlF2GqGk",
  authDomain: "meteorfy-11bff.firebaseapp.com",
  projectId: "meteorfy-11bff",
  storageBucket: "meteorfy-11bff.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase app for client SDK
const apps = getApps();
const firebaseApp = apps.length === 0
  ? initializeApp(firebaseClientConfig)
  : apps[0];

// Get Firebase Storage instance
const storage = getStorage(firebaseApp as any);

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private bucketName = "meteorfy-11bff.firebasestorage.app";

  constructor() { }

  async searchPublicObject(filePath: string): Promise<{ publicUrl: string } | null> {
    try {
      const storageRef = ref(storage, filePath);
      const url = await getDownloadURL(storageRef);
      return { publicUrl: url };
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        return null;
      }
      console.error("Error searching object:", error);
      return null;
    }
  }

  async downloadObject(fileInfo: any, res: Response) {
    try {
      const response = await fetch(fileInfo.publicUrl);
      if (!response.ok) throw new Error("Falha ao buscar arquivo");

      const buffer = await response.arrayBuffer();
      res.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Erro no download:", error);
      res.status(500).json({ error: "Erro ao baixar arquivo" });
    }
  }

  async getObjectEntityUploadURL(name: string): Promise<string> {
    const objectId = randomUUID();
    const filePath = `public/${objectId}-${name}`;
    return filePath;
  }

  async getObjectEntityFile(objectPath: string) {
    return await this.searchPublicObject(objectPath);
  }

  normalizeObjectEntityPath(path: string) {
    return path.startsWith("/") ? path : `/${path}`;
  }

  async uploadBuffer(path: string, buffer: Buffer, contentType: string) {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, buffer, {
        contentType,
      });
      return {
        path: snapshot.ref.fullPath,
        name: snapshot.ref.name,
      };
    } catch (error) {
      console.error("Error uploading to Firebase Storage:", error);
      throw error;
    }
  }
}
