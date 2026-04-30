// ... (código anterior mantido) ...

export const api = {
  products: {
    // ... (mantido)
  },
  checkouts: {
    // ... (mantido)
  },
  sales: {
    // ... (mantido)
  },
  settings: {
    // ... (mantido)
  },
  stats: {
    // ... (mantido)
  },
  // ==================== AFILIADOS ====================
  affiliates: {
    list: {
      method: 'GET' as const,
      path: '/api/affiliates',
    },
    create: {
      method: 'POST' as const,
      path: '/api/affiliates',
      input: insertAffiliateSchema,
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/affiliates/:id',
      input: updateAffiliateSchema,
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/affiliates/:id',
    },
    stats: {
      method: 'GET' as const,
      path: '/api/affiliates/stats',
    },
  },
  affiliateLinks: {
    list: {
      method: 'GET' as const,
      path: '/api/affiliate-links',
    },
    create: {
      method: 'POST' as const,
      path: '/api/affiliate-links',
      input: insertAffiliateLinkSchema,
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/affiliate-links/:id',
    },
  },
  commissions: {
    list: {
      method: 'GET' as const,
      path: '/api/commissions',
    },
  },
  affiliateWithdrawals: {
    create: {
      method: 'POST' as const,
      path: '/api/affiliate-withdrawals',
      input: insertAffiliateWithdrawalSchema,
    },
  },
};