// ... (código anterior mantido) ...

  // Sales
  async getSales(userId?: string, since?: Date): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        let query = `SELECT * FROM sales WHERE status = 'paid'`;
        const params: any[] = [];
        
        if (userId) {
          query += ` AND user_id = $1`;
          params.push(userId);
        }

        // Filtro de "since" para polling
        if (since) {
          query += ` AND created_at > $${params.length + 1}`;
          params.push(since.toISOString());
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const result = await client.query(query, params);
        return result.rows.map(row => toCamelCase(row));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting sales:", error);
      return [];
    }
  }

  async getSale(id: number): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`SELECT * FROM sales WHERE id = $1 LIMIT 1`, [id]);
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting sale:", error);
      return undefined;
    }
  }

// ... (resto do arquivo mantido) ...