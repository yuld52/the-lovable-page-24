// ... keep existing code (Products component state and handlers)
                  <div>
                    <p className="text-sm text-zinc-500">MZN</p>
                    <p className="text-xl font-bold text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'MZN' }).format(product.price / 100)}
                    </p>
                  </div>
                  // ... keep existing code (product action buttons and card layout)
    </Layout>
  );
}