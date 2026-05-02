import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDbClient } from "./_lib/database";
import { verifyAuth } from "./_lib/auth";
import { toCamelCase } from "./_lib/database";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const auth = await verifyAuth(req);

  try {
    const client = await getDbClient();
    try {
      const userId = auth.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { period, productId, startDate: startDateStr, endDate: endDateStr } = req.query;

      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (period === "custom" && startDateStr && endDateStr) {
        startDate = new Date(startDateStr as string);
        endDate = new Date(endDateStr as string);
      } else if (period === "1") {
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === "7") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === "90") {
        startDate.setDate(startDate.getDate() - 90);
      } else if (period === "30" || !period) {
        startDate.setDate(startDate.getDate() - 30);
      }

      let query = `
        SELECT * FROM sales 
        WHERE user_id = $1 
        AND status = 'paid'
        AND created_at >= $2 
        AND created_at <= $3
      `;

      const params: any[] = [userId, startDate, endDate];

      if (productId && productId !== "all") {
        query += ` AND product_id = $4`;
        params.push(productId);
      }

      const result = await client.query(query, params);
      const sales = result.rows.map((row: any) => toCamelCase(row));

      const checkoutsResult = await client.query(
        `SELECT * FROM checkouts WHERE owner_id = $1`,
        [userId]
      );

      let totalViews = 0;
      checkoutsResult.rows.forEach((row: any) => {
        if (productId && productId !== "all") {
          if (String(row.product_id) === String(productId)) {
            totalViews += row.views || 0;
          }
        } else {
          totalViews += row.views || 0;
        }
      });

      const totalRevenue = sales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
      const conversionRate = totalViews > 0 ? (sales.length / totalViews) * 100 : 0;

      const chartData: { name: string; sales: number }[] = [];
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      for (let i = diffDays; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        const daySales = sales.filter((s: any) => {
          const saleDate = new Date(s.createdAt);
          return (
            saleDate.getDate() === d.getDate() &&
            saleDate.getMonth() === d.getMonth() &&
            saleDate.getFullYear() === d.getFullYear()
          );
        });
        const dayTotal = daySales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
        chartData.push({ name: key, sales: dayTotal / 100 });
      }

      return res.json({
        salesToday: totalRevenue / 100,
        revenuePaid: totalRevenue / 100,
        salesApproved: sales.length,
        conversionRate,
        revenueTarget: 10000,
        revenueCurrent: totalRevenue / 100,
        chartData,
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("Stats API error:", error);
    return res.status(500).json({
      salesToday: 0,
      revenuePaid: 0,
      salesApproved: 0,
      conversionRate: 0,
      revenueTarget: 10000,
      revenueCurrent: 0,
      chartData: [],
    });
  }
}
