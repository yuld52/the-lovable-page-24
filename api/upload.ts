import { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth } from "./_lib/auth";
import { adminStorage } from "./_lib/firebase-admin";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 64 * 1024 * 1024 }, // 64MB
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const auth = await verifyAuth(req);
  if (!auth.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Handle multer upload
  const multerSingle = upload.single("file");
  
  return new Promise((resolve) => {
    multerSingle(req as any, res as any, async (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        return resolve(res.status(400).json({ message: err.message || "Upload error" }));
      }

      try {
        const file = (req as any).file;
        if (!file) {
          return resolve(res.status(400).json({ message: "No file uploaded" }));
        }

        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = `public/${fileName}`;

        // Upload to Firebase Storage
        const bucket = adminStorage.bucket();
        const fileUpload = bucket.file(filePath);

        await fileUpload.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
            metadata: {
              originalName: file.originalname,
            }
          }
        });

        // Make the file public
        await fileUpload.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        console.log(`[Upload] File uploaded: ${publicUrl}`);

        return resolve(res.json({
          url: publicUrl,
          path: filePath,
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
        }));
      } catch (error: any) {
        console.error("Upload error:", error);
        return resolve(res.status(500).json({ message: error.message || "Failed to upload" }));
      }
    });
  });
}