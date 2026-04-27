import { Switch, Route, useRoute } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import EditProduct from "@/pages/EditProduct";
import Checkouts from "@/pages/Checkouts";
import Settings from "@/pages/Settings";
import CreateProduct from "@/pages/CreateProduct";
import CheckoutEditor from "@/pages/CheckoutEditor";
import PublicCheckout from "./pages/PublicCheckout";

function Router() {
  const [params, setLocation] = useRoute("/:any*");

  useEffect(() => {
    const hostname = window.location.hostname;
    const isPayDomain = hostname === "pay.meteorfy.online";
    const isAppDomain = hostname === "app.meteorfy.online";
    const path = window.location.pathname;

    // Se estiver no domínio de pagamento (pay.), só permite o checkout
    if (isPayDomain && !path.startsWith("/checkout")) {
      // Redireciona para o app principal se tentar acessar dashboard/login pelo domínio de pagamento
      window.location.href = "https://app.meteorfy.online";
    }

    // Se estiver no domínio do app (app.) e tentar acessar checkout, pode redirecionar para o domínio de pagamento (opcional/avançado)
    // Mas o usuário pediu para dividir, então o ideal é o checkout viver em pay.
    // if (isAppDomain && path.startsWith("/checkout")) {
    //   window.location.href = `https://pay.meteorfy.online${path}`;
    // }

    // Define o título padrão para as páginas do app (Login, Dashboard, etc.)
    if (!path.startsWith("/checkout")) {
      document.title = "Meteorfy - Plataforma de Vendas";
    }

  }, []);

  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/products" component={Products} />
      <Route path="/products/new" component={CreateProduct} />
      <Route path="/products/edit/:id" component={EditProduct} />
      <Route path="/checkouts" component={Checkouts} />
      <Route path="/checkouts/new" component={CheckoutEditor} />
      <Route path="/checkouts/edit/:id" component={CheckoutEditor} />
      <Route path="/checkout/:slug" component={PublicCheckout} />
      <Route path="/settings" component={Settings} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
