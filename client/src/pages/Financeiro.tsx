// ... keep existing code (Financeiro component state and hooks)
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'MZN'
    }).format(cents / 100);
  };

  const handleWithdraw = async () => {
  // ... keep existing code (withdrawal logic and confirmation dialog)
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Método:</span>
              <span className="text-sm font-medium text-purple-400">PIX Instantâneo</span>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-400">
              ⚠️ O processamento leva até 3 dias úteis. Certifique-se que a chave PIX está correta.
            </p>
          </div>
        </div>
        // ... keep existing code (withdrawal dialog footer and success dialog)
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Status:</span>
              <span className="text-sm font-medium text-amber-400">Pendente</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mb-6">
            O processamento leva até 3 dias úteis. Você receberá uma notificação quando o valor for enviado.
          </p>
          <Button
            onClick={() => setWithdrawSuccess(false)}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white"
          >
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}