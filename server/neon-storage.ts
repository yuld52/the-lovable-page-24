// ... (código anterior mantido) ...

// ==================== AFILIADOS ====================

  // Affiliates
  async getAffiliates(ownerId?: string): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        let query = `SELECT * FROM affiliates`;
        const params: any[] = [];
        
        if (ownerId) {
          query += ` WHERE owner_id = $1`;
          params.push(ownerId);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const result = await client.query(query, params);
        return result.rows.map(row => toCamelCase(row));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting affiliates:", error);
      return [];
    }
  }

  async getAffiliate(id: number): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`SELECT * FROM affiliates WHERE id = $1`, [id]);
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting affiliate:", error);
      return undefined;
    }
  }

  async getAffiliateByCode(code: string): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`SELECT * FROM affiliates WHERE code = $1 LIMIT 1`, [code]);
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting affiliate by code:", error);
      return undefined;
    }
  }

  async createAffiliate(affiliate: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const data = toSnakeCase(affiliate);
        const result = await client.query(`
          INSERT INTO affiliates (owner_id, name, email, code, commission_rate, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          data.owner_id,
          data.name,
          data.email,
          data.code,
          data.commission_rate || "10.00",
          data.status || 'pending'
        ]);
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating affiliate:", error);
      throw error;
    }
  }

  async updateAffiliate(id: number, updates: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const updateData = toSnakeCase(updates);
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        
        Object.keys(updateData).forEach(key => {
          if (key !== 'id' && key !== 'created_at' && key !== 'owner_id') {
            setClauses.push(`${key} = $${paramCount}`);
            values.push(updateData[key]);
            paramCount++;
          }
        });
        
        values.push(id);
        
        const result = await client.query(`
          UPDATE affiliates 
          SET ${setClauses.join(', ')}, updated_at = NOW()
          WHERE id = $${paramCount}
          RETURNING *
        `, values);
        
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating affiliate:", error);
      throw error;
    }
  }

  async deleteAffiliate(id: number): Promise<void> {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`DELETE FROM affiliates WHERE id = $1`, [id]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error deleting affiliate:", error);
      throw error;
    }
  }

  async incrementAffiliateClicks(id: number): Promise<void> {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`
          UPDATE affiliates 
          SET total_clicks = COALESCE(total_clicks, 0) + 1 
          WHERE id = $1
        `, [id]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error incrementing affiliate clicks:", error);
    }
  }

  // Affiliate Links
  async getAffiliateLinks(affiliateId?: number): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        let query = `SELECT * FROM affiliate_links`;
        const params: any[] = [];
        
        if (affiliateId) {
          query += ` WHERE affiliate_id = $1`;
          params.push(affiliateId);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const result = await client.query(query, params);
        return result.rows.map(row => toCamelCase(row));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting affiliate links:", error);
      return [];
    }
  }

  async createAffiliateLink(link: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const data = toSnakeCase(link);
        
        // Generate unique slug
        const slug = data.slug || `af_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        const result = await client.query(`
          INSERT INTO affiliate_links (affiliate_id, product_id, checkout_id, slug)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [
          data.affiliate_id,
          data.product_id || null,
          data.checkout_id || null,
          slug
        ]);
        
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating affiliate link:", error);
      throw error;
    }
  }

  async getAffiliateLinkBySlug(slug: string): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`SELECT * FROM affiliate_links WHERE slug = $1 AND active = true LIMIT 1`, [slug]);
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting affiliate link by slug:", error);
      return undefined;
    }
  }

  async incrementLinkClicks(id: number): Promise<void> {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`
          UPDATE affiliate_links 
          SET clicks = COALESCE(clicks, 0) + 1 
          WHERE id = $1
        `, [id]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error incrementing link clicks:", error);
    }
  }

  async incrementLinkConversions(id: number): Promise<void> {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`
          UPDATE affiliate_links 
          SET conversions = COALESCE(conversions, 0) + 1 
          WHERE id = $1
        `, [id]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error incrementing link conversions:", error);
    }
  }

  async deleteAffiliateLink(id: number): Promise<void> {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`DELETE FROM affiliate_links WHERE id = $1`, [id]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error deleting affiliate link:", error);
      throw error;
    }
  }

  // Commissions
  async getCommissions(affiliateId?: number): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        let query = `
          SELECT c.*, p.name as product_name 
          FROM commissions c
          LEFT JOIN products p ON c.product_id = p.id
        `;
        const params: any[] = [];
        
        if (affiliateId) {
          query += ` WHERE c.affiliate_id = $1`;
          params.push(affiliateId);
        }
        
        query += ` ORDER BY c.created_at DESC`;
        
        const result = await client.query(query, params);
        return result.rows.map(row => toCamelCase(row));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting commissions:", error);
      return [];
    }
  }

  async createCommission(commission: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const data = toSnakeCase(commission);
        const result = await client.query(`
          INSERT INTO commissions (affiliate_id, sale_id, product_id, amount, commission_rate, commission_amount, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          data.affiliate_id,
          data.sale_id || null,
          data.product_id || null,
          data.amount,
          data.commission_rate,
          data.commission_amount,
          data.status || 'pending'
        ]);
        
        // Update affiliate totals
        await client.query(`
          UPDATE affiliates 
          SET total_conversions = COALESCE(total_conversions, 0) + 1,
              total_earnings = COALESCE(total_earnings, 0) + $1
          WHERE id = $2
        `, [data.commission_amount, data.affiliate_id]);
        
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating commission:", error);
      throw error;
    }
  }

  async updateCommissionStatus(id: number, status: string): Promise<void> {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`
          UPDATE commissions 
          SET status = $1 
          WHERE id = $2
        `, [status, id]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating commission status:", error);
    }
  }

  async approveCommission(id: number): Promise<any> {
    return this.updateCommissionStatus(id, 'approved');
  }

  async payCommission(id: number): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`
          UPDATE commissions 
          SET status = 'paid', paid_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [id]);
        
        if (result.rows.length > 0) {
          const commission = toCamelCase(result.rows[0]);
          // Update affiliate paid earnings
          await client.query(`
            UPDATE affiliates 
            SET paid_earnings = COALESCE(paid_earnings, 0) + $1
            WHERE id = $2
          `, [commission.commissionAmount, commission.affiliateId]);
        }
        
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error paying commission:", error);
      throw error;
    }
  }

  // Affiliate Withdrawals
  async getAffiliateWithdrawals(affiliateId?: number): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        let query = `SELECT * FROM affiliate_withdrawals`;
        const params: any[] = [];
        
        if (affiliateId) {
          query += ` WHERE affiliate_id = $1`;
          params.push(affiliateId);
        }
        
        query += ` ORDER BY requested_at DESC`;
        
        const result = await client.query(query, params);
        return result.rows.map(row => toCamelCase(row));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting affiliate withdrawals:", error);
      return [];
    }
  }

  async createAffiliateWithdrawal(withdrawal: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const data = toSnakeCase(withdrawal);
        const result = await client.query(`
          INSERT INTO affiliate_withdrawals (affiliate_id, amount, pix_key, pix_key_type, status)
          VALUES ($1, $2, $3, $4, 'pending')
          RETURNING *
        `, [
          data.affiliate_id,
          data.amount,
          data.pix_key,
          data.pix_key_type || 'email'
        ]);
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating affiliate withdrawal:", error);
      throw error;
    }
  }

  async updateAffiliateWithdrawalStatus(id: number, status: string, adminNote?: string): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`
          UPDATE affiliate_withdrawals 
          SET status = $1, processed_at = NOW(), admin_note = $2
          WHERE id = $3
          RETURNING *
        `, [status, adminNote || null, id]);
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating affiliate withdrawal status:", error);
      throw error;
    }
  }

  async getAffiliateStats(ownerId: string): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`
          SELECT 
            COUNT(*) as total_affiliates,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_affiliates,
            SUM(total_earnings) as total_earnings,
            SUM(total_conversions) as total_conversions
          FROM affiliates 
          WHERE owner_id = $1
        `, [ownerId]);
        
        return {
          totalAffiliates: parseInt(result.rows[0]?.total_affiliates || 0),
          activeAffiliates: parseInt(result.rows[0]?.active_affiliates || 0),
          totalEarnings: parseInt(result.rows[0]?.total_earnings || 0),
          totalConversions: parseInt(result.rows[0]?.total_conversions || 0),
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting affiliate stats:", error);
      return {
        totalAffiliates: 0,
        activeAffiliates: 0,
        totalEarnings: 0,
        totalConversions: 0,
      };
    }
  }