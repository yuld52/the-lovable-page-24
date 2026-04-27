import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@shared/schema";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

function getRange(period?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate: Date;
  let endDate: Date = new Date();

  if (period === "0") {
    // Hoje
    startDate = new Date(today);
    endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "1") {
    // Ontem
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 1);
    endDate = new Date(today);
    endDate.setDate(today.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "7") {
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 7);
  } else if (period === "90") {
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 90);
  } else {
    // Default 30 days
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);
  }

  // make end exclusive (+1ms) when filtering with lt
  return { startDate, endDate };
}

export function useStats(period?: string, productId?: string) {
  return useQuery<DashboardStats>({
    queryKey: ["stats", { period: period ?? "30", productId: productId ?? "all" }],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) {
        return {
          salesToday: 0,
          revenuePaid: 0,
          salesApproved: 0,
          revenueTarget: 10000,
          revenueCurrent: 0,
          chartData: [],
        };
      }

      const { startDate, endDate } = getRange(period);

      // Query Firestore for sales
      const salesRef = collection(db, "sales");
      const q = query(
        salesRef,
        where("user_id", "==", user.uid),
        where("status", "==", "paid"),
        where("created_at", ">=", startDate.toISOString()),
        where("created_at", "<=", endDate.toISOString())
      );

      const querySnapshot = await getDocs(q);
      const rows: Array<{
        amount: number;
        created_at: string;
        product_id: number | null;
        status: string;
      }> = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter by productId if specified
        if (productId && productId !== "all") {
          if (data.product_id !== Number(productId)) return;
        }
        rows.push({
          amount: data.amount || 0,
          created_at: data.created_at,
          product_id: data.product_id,
          status: data.status,
        });
      });

      const totalMinor = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
      const paidCount = rows.length;

      // Chart buckets
      const chartData: { name: string; sales: number }[] = [];
      const isHourly = period === "0" || period === "1";

      if (isHourly) {
        const buckets = Array.from({ length: 24 }, () => 0);
        for (const r of rows) {
          const d = new Date(r.created_at);
          const h = d.getHours();
          buckets[h] += Number(r.amount || 0);
        }
        for (let i = 0; i < 24; i++) {
          chartData.push({
            name: i === 23 ? "23:59" : `${String(i).padStart(2, "0")}:00`,
            sales: buckets[i] / 100,
          });
        }
      } else {
        const days = period === "7" ? 7 : period === "90" ? 90 : 30;
        const totalsByDay = new Map<string, number>();
        for (const r of rows) {
          const d = new Date(r.created_at);
          const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(r.amount || 0));
        }

        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(new Date().getDate() - i);
          const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          chartData.push({
            name: key,
            sales: (totalsByDay.get(key) ?? 0) / 100,
          });
        }
      }

      return {
        salesToday: totalMinor / 100,
        revenuePaid: totalMinor / 100,
        salesApproved: paidCount,
        revenueTarget: 10000,
        revenueCurrent: totalMinor / 100,
        chartData,
      };
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
