import { Switch, Route, useRoute } from "wouter";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
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
import Sales from "@/pages/Sales";
import Settings from "@/pages/Settings";
import CreateProduct from "@/pages/CreateProduct";
import CheckoutEditor from "@/pages/CheckoutEditor";
import PublicCheckout from "./pages/PublicCheckout";
import Financeiro from "@/pages/Financeiro";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import { ChatSupport } from "@/components/ChatSupport";

function Router() {
  const [params, setLocation] = useRoute("/:any*");

  useEffect(() => {
    const hostname = window.location.hostname;
    const isPayDomain = hostname === "pay.meteorfy.online";
    const path = window.location.pathname;

    // Se estiver no domínio de pagamento (pay.), só permite o checkout
    if (isPayDomain && !path.startsWith("/checkout")) {
      window.location.href = "https://app.meteorfy.online";
    }

    // Define o título padrão para as páginas do app (Login, Dashboard, etc.)
    if (!path.startsWith("/checkout") && !path.startsWith("/admin")) {
      document.title = "Meteorfy - Plataforma de Vendas";
    } else if (path.startsWith("/admin")) {
      document.title = "Meteorfy - Painel Admin";
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
      <Route path="/sales" component={Sales} />
      <Route path="/financeiro" component={Financeiro} />
      <Route path="/settings" component={Settings} />
      
      {/* Admin Routes */}
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/products" component={Admin} />
      <Route path="/admin/users" component={Admin} />
      <Route path="/admin/settings" component={Admin} />
      
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
        <ChatSupport />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;