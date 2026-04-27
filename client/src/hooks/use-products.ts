import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateProductRequest, UpdateProductRequest, Product } from "@shared/schema";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";

function toDbInsert(payload: CreateProductRequest, userId: string) {
  return {
    user_id: userId,
    name: payload.name,
    description: payload.description,
    price: payload.price,
    image_url: payload.imageUrl ?? null,
    delivery_url: payload.deliveryUrl ?? null,
    whatsapp_url: payload.whatsappUrl ?? null,
    delivery_files: payload.deliveryFiles ?? [],
    no_email_delivery: payload.noEmailDelivery ?? false,
    active: payload.active ?? true,
    created_at: new Date().toISOString(),
  };
}

function toDbUpdate(payload: UpdateProductRequest) {
  const update: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) update.name = payload.name;
  if (payload.description !== undefined) update.description = payload.description;
  if (payload.price !== undefined) update.price = payload.price;
  if (payload.imageUrl !== undefined) update.image_url = payload.imageUrl;
  if (payload.deliveryUrl !== undefined) update.delivery_url = payload.deliveryUrl;
  if (payload.whatsappUrl !== undefined) update.whatsapp_url = payload.whatsappUrl;
  if (payload.deliveryFiles !== undefined) update.delivery_files = payload.deliveryFiles;
  if (payload.noEmailDelivery !== undefined) update.no_email_delivery = payload.noEmailDelivery;
  if (payload.active !== undefined) update.active = payload.active;

  return update;
}

function mapDocToProduct(docData: any, docId: string): Product {
  console.log("mapDocToProduct - docId:", docId, "docData:", docData);
  const numericId = parseInt(docId);
  return {
    id: isNaN(numericId) ? 0 : numericId, // Use 0 for string IDs, numeric for numeric IDs
    name: docData.name,
    description: docData.description,
    price: docData.price,
    imageUrl: docData.imageUrl,
    deliveryUrl: docData.deliveryUrl,
    whatsappUrl: docData.whatsappUrl,
    deliveryFiles: docData.deliveryFiles,
    noEmailDelivery: docData.noEmailDelivery,
    active: docData.active,
    createdAt: docData.createdAt ? new Date(docData.createdAt) : null,
  };
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const user = auth.currentUser;
      console.log("useProducts - current user:", user?.uid);
      if (!user) {
        console.log("useProducts - no user, returning empty array");
        return [];
      }

      // Use API to get products with proper user filtering
      const idToken = await user.getIdToken();
      const response = await fetch("/api/products", {
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        console.log("useProducts - failed to fetch products:", response.status);
        return [];
      }
      
      const products = await response.json();
      console.log("useProducts - found products:", products.length);
      return products as Product[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useProduct(id: string | number) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const user = auth.currentUser;
      console.log("useProduct - loading product id:", id, "user:", user?.uid);
      if (!user) return null;

      const docRef = doc(db, "products", String(id));
      const docSnap = await getDoc(docRef);
      console.log("useProduct - doc exists:", docSnap.exists());

      if (!docSnap.exists()) return null;

      const data = docSnap.data();
      console.log("useProduct - product data:", data);
      console.log("useProduct - comparing userId:", data.userId, "vs", user.uid);
      if (data.userId !== user.uid) return null;

      return mapDocToProduct(data, docSnap.id);
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProductRequest) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      const idToken = await user.getIdToken();
      
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar produto");
      }
      
      return response.json();
    },
    onError: (error) => {
      console.error("Error creating product:", error);
    },
    onSuccess: () => {
      console.log("Product created successfully, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateProductRequest) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      const docRef = doc(db, "products", String(id));
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) throw new Error("Product not found");

      const data = docSnap.data();
      if (data.user_id !== user.uid) throw new Error("Unauthorized");

      await updateDoc(docRef, toDbUpdate(updates));

      const updatedSnap = await getDoc(docRef);
      return mapDocToProduct(updatedSnap.data()!, docSnap.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      const docRef = doc(db, "products", String(id));
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) throw new Error("Product not found");

      const data = docSnap.data();
      if (data.user_id !== user.uid) throw new Error("Unauthorized");

      await deleteDoc(docRef);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}
