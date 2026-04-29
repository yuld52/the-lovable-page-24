import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStats } from "@/hooks/use-stats";
import { Loader2, PackageX, Eye, EyeOff, CalendarIcon, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { format, isValid, parseISO, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/hooks/use-products";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useAutoCurrency, useUsdRates } from "@/hooks/use-currency";
import { convertUsdCentsToCurrencyMinor, formatMoney, type SupportedCurrencyCode } from "@/lib/currency";
import { useSettings } from "@/hooks/use-settings";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState("0");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("AUTO");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Prepare query params for custom range
  const statsParams = useMemo(() => {
    if (selectedPeriod === "custom" && dateRange?.from && dateRange?.to) {
      return {
        period: "custom",
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString()
      };
    }
    return { period: selectedPeriod };
  }, [selectedPeriod, dateRange]);

  const { data: stats, isLoading: statsLoading } = useStats(
    statsParams.period, 
    selectedProduct,
    (statsParams as any).startDate,
    (statsParams as any).endDate
  );
  
  const { data: products, isLoading: productsLoading } = useProducts();
  const [showSales, setShowSales] = useState(true);
  const [showQty, setShowQty] = useState(true);
  const [showConversion, setShowConversion] = useState(true);

  const { data: autoCurrency } = useAutoCurrency();
  const { data: usdRates } = useUsdRates();
  const { data: settings } = useSettings();

  const resolvedCurrency: SupportedCurrencyCode = useMemo(() => {
    if (selectedCurrency === "AUTO") {
      return (autoCurrency || "USD") as SupportedCurrencyCode;
    }
    return selectedCurrency as SupportedCurrencyCode;
  }, [selectedCurrency, autoCurrency]);

  const usdToCurrencyRate = usdRates?.[resolvedCurrency] ?? 1;

  const convertUsdCents = (usdCents: number) => {
    return convertUsdCentsToCurrencyMinor(usdCents, resolvedCurrency, usdToCurrencyRate);
  };

  const formatCurrency = (usdCents: number) => {
    return formatMoney(
      { currency: resolvedCurrency, minor: convertUsdCents(usdCents) },
      typeof navigator !== "undefined" ? navigator.language : undefined
    );
  };

  const chartData = useMemo(() => {
    if (!stats?.chartData) return [];
    return stats.chartData.map((item: any) => ({
      ...item,
      sales: item.sales ? item.sales * (usdToCurrencyRate || 1) : 0
    }));
  }, [stats, usdToCurrencyRate]);

  const formatXAxisTick = useMemo(() => {
    const isHourly = selectedPeriod === "0" || selectedPeriod === "1";

    return (raw: unknown) => {
      if (raw == null) return "";
      const value = String(raw);

      if (isHourly) {
        if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
        if (/^\d{1,2}$/.test(value)) return `${value.padStart(2, "0")}:00`;
        const d = parseISO(value);
        return isValid(d) ? format(d, "HH:mm") : value;
      }

      if (/^\d{2}\/\d{2}$/.test(value)) return value;
      const d = parseISO(value);
      return isValid(d) ? format(d, "dd/MM") : value;
    };
  }, [selectedPeriod]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const value = Number(payload[0].value ?? 0);
    const valueText = formatMoney(
      { currency: resolvedCurrency, minor: value },
      typeof navigator !== "undefined" ? navigator.language : undefined
    );

    return (
      <div className="rounded-xl border border-border/60 bg-card px-3 py-2 shadow-xl">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-sm font-semibold text-foreground">{valueText}</div>
          <div className="text-[11px] font-medium text-muted-foreground">Faturamento</div>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground/80">{String(label)}</div>
      </div>
    );
  };

  if (statsLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <Layout title="Dashboard" subtitle="Visão geral das suas vendas">
      <div className="flex flex-col sm:flex-row items-end justify-end gap-3 mb-6">
        <div className="w-full sm:w-48">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="bg-card border-border text-muted-foreground h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="bg-card border-border text-muted-foreground h-10">
              <SelectValue placeholder="Moeda" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground max-h-[300px]">
              <SelectItem value="AUTO">Automático ({autoCurrency || 'USD'})</SelectItem>
              <SelectItem value="USD">USD - Dólar Americano</SelectItem>
              <SelectItem value="BRL">BRL - Real Brasileiro</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="GBP">GBP - Libra Esterlina</SelectItem>
              <SelectItem value="CAD">CAD - Dólar Canadense</SelectItem>
              <SelectItem value="AUD">AUD - Dólar Australiano</SelectItem>
              <SelectItem value="JPY">JPY - Iene Japonês</SelectItem>
              <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedPeriod === "custom" && (
          <div className="w-full sm:w-64">
            <div className="relative">
              <span className="absolute -top-2.5 left-3 px-1 bg-background text-[10px] text-muted-foreground z-10 font-medium uppercase tracking-wider">
                Intervalo
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-card border-border h-10",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yy")} -{" "}
                          {format(dateRange.to, "dd/MM/yy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yy")
                      )
                    ) : (
                      <span>Selecione as datas</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        <div className="w-full sm:w-48">
          <div className="relative">
            <span className="absolute -top-2.5 left-3 px-1 bg-background text-[10px] text-muted-foreground z-10 font-medium uppercase tracking-wider">
              Período
            </span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="bg-card border-border text-foreground h-10">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="0">Hoje</SelectItem>
                <SelectItem value="1">Ontem</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-card border-border/60 shadow-lg transition-all duration-300 group relative overflow-hidden hover:border-primary/50 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-md" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">VENDAS REALIZADAS</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowSales(!showSales)}
            >
              {showSales ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-bold text-foreground mb-0.5">
              {showSales
                ? formatCurrency(stats?.salesToday || 0)
                : "••••••"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60 shadow-lg transition-all duration-300 group relative overflow-hidden hover:border-primary/50 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-md" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">QUANTIDADE DE VENDAS</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowQty(!showQty)}
            >
              {showQty ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-bold text-foreground mb-0.5">{showQty ? stats?.salesApproved || 0 : "••••"}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60 shadow-lg transition-all duration-300 group relative overflow-hidden hover:border-primary/50 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-md" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TAXA DE CONVERSÃO</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowConversion(!showConversion)}
            >
              {showConversion ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-bold text-foreground mb-0.5">
              {showConversion ? `${(stats?.conversionRate || 0).toFixed(2)}%` : "••••"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/60 shadow-lg">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-bold text-foreground tracking-tight">Faturamento do Período ({resolvedCurrency})</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.5} />
                <XAxis
                  dataKey="name"
                  tickFormatter={formatXAxisTick}
                  stroke="#52525b"
                  tick={{ fill: "#a1a1aa", fontSize: 9, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  dy={10}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => {
                    const minor = Number(value);
                    return formatMoney(
                      { currency: resolvedCurrency, minor },
                      typeof navigator !== "undefined" ? navigator.language : undefined
                    );
                  }}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#a855f7", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#a855f7"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}