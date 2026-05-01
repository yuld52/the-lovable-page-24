// ... keep existing code (Sales component state, filtering, and helpers)
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'MZN'
    }).format(cents / 100);
  };

  const handleExportPDF = () => {
  // ... keep existing code (sales list table and status badges)
                <td className="w-24 shrink-0 text-center px-4">
                  <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">
                    paypal
                  </span>
                </td>

                // ... keep existing code (status badges and table rows)
    </Layout>
  );
}