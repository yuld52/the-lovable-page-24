import { useEffect } from "react";
import { useLocation, Switch, Route } from "wouter";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import CreateProduct from "@/pages/CreateProduct";
import EditProduct from "@/pages/EditProduct";
import Checkouts from "@/pages/Checkouts";
import CheckoutEditor from "@/pages/CheckoutEditor";
import PublicCheckout from "@/pages/PublicCheckout";
import Sales from "@/pages/Sales";
import Financeiro from "@/pages/Financeiro";
import Affiliates from "@/pages/Affiliates";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import MembersArea from "@/pages/MembersArea";
import FAQ from "@/pages/FAQ";
import NotFound from "@/pages/not-found";

// Admin Pages
import AdminLogin from "@/pages/AdminLogin";
import Admin from "@/pages/Admin";
import AdminProducts from "@/pages/AdminProducts";
import AdminUsers from "@/pages/AdminUsers";
import AdminWithdrawals from "@/pages/AdminWithdrawals";
import AdminAffiliates from "@/pages/AdminAffiliates";
import AdminSettings from "@/pages/AdminSettings";

export default function App() {
  const [location] = useLocation();

  useEffect(() => {
    const hostname = window.location.hostname;
    const path = window.location.pathname;
    
    // Only redirect if on the payment subdomain and NOT accessing a checkout
    if (hostname === "pay.meteorfy.online" && !path.startsWith("/checkout")) {
      window.location.href = "https://app.meteorfy.online";
    }

    // Set default title
    if (!path.startsWith("/checkout") && !path.startsWith("/admin") && !path.startsWith("/faq")) {
      document.title = "Meteorfy - Plataforma de Vendas";
    } else if (path.startsWith("/admin")) {
      document.title = "Meteorfy - Painel Admin";
    } else if (path.startsWith("/faq")) {
      document.title = "Meteorfy - Central de Ajuda";
    }
  }, [location]);

  return (
    <ErrorBoundary>
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
        <Route path="/affiliates" component={Affiliates} />
        <Route path="/settings" component={Settings} />
        <Route path="/profile" component={Profile} />
        <Route path="/members-area" component={MembersArea} />
        <Route path="/faq" component={FAQ} />
        
        {/* Admin Routes */}
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/withdrawals" component={AdminWithdrawals} />
        <Route path="/admin/affiliates" component={AdminAffiliates} />
        <Route path="/admin/settings" component={AdminSettings} />
        
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}