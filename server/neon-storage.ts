// ... (top of file remains the same until getDashboardStats)

  // Dashboard stats
  async getDashboardStats(userId: string, period?: string, productId?: string, startDateStr?: string, endDateStr?: string): Promise<any> {
    let client: PoolClient | null = null;
    try {
      client = await getPool().connect();
      
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (period === "custom" && startDateStr && endDateStr) {
        startDate = new Date(startDateStr);
        endDate = new Date(endDateStr);
      } else if (period === "1") { // Yesterday
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
      const sales = result.rows.map(row => toCamelCase(row));
      
      // Get views from checkouts
      const checkoutsResult = await client.query(`
        SELECT * FROM checkouts 
        WHERE owner_id = $1`
      `, [userId]);
      
      let totalViews = 0;
      checkoutsResult.rows.forEach((row: any) => {
        if (productId && productId !== "all") {
          if (String(row.product_id) === String(productId)) {
            totalViews += (row.views || 0);
          }
        } else {
          totalViews += (row.views || 0);
        }
      });
      
      const totalRevenue = sales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
      const conversionRate = totalViews > 0 ? (sales.length / totalViews) * 100 : 0;
      
      // Chart Data
      const chartData: { name: string; sales: number }[] = [];
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      for (let i = diffDays; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const daySales = sales.filter((s: any) => {
          const saleDate = new Date(s.created_at);
          return saleDate.getDate() === d.getDate() && 
                 saleDate.getMonth() === d.getMonth() && 
                 saleDate.getFullYear() === d.getFullYear();
        });
        const dayTotal = daySales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
        chartData.push({ name: key, sales: dayTotal / 100 });
      }
      
      return {
        salesToday: totalRevenue / 100,
        revenuePaid: totalRevenue / 100,
        salesApproved: sales.length,
        conversionRate,
        revenueTarget: 10000,
        revenueCurrent: totalRevenue / 100,
        chartData,
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      return { 
        salesToday: 0, 
        revenuePaid: 0, 
        salesApproved: 0, 
        conversionRate: 0, 
        revenueTarget: 10000, 
        revenueCurrent: 0, 
        chartData: [] 
      };
    } finally {
      if (client) client.release();
    }
  }

export const neonStorage = new NeonStorage();