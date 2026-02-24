import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalAlerts } from "@/components/GlobalAlerts";
import { CookieConsent } from "@/components/CookieConsent";

// Eagerly load Index (critical path)
import Index from "./pages/Index";

// Lazy load non-critical routes
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Help = lazy(() => import("./pages/Help"));
const Tools = lazy(() => import("./pages/Tools"));
const BrandabilityScorePage = lazy(() => import("./pages/tools/BrandabilityScorePage"));
const DomainGeneratorPage = lazy(() => import("./pages/tools/DomainGeneratorPage"));

const PronounceabilityPage = lazy(() => import("./pages/tools/PronounceabilityPage"));
const BulkCheckerPage = lazy(() => import("./pages/tools/BulkCheckerPage"));
const TldComparePage = lazy(() => import("./pages/tools/TldComparePage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Methodology = lazy(() => import("./pages/Methodology"));
const SharedReport = lazy(() => import("./pages/SharedReport"));

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <GlobalAlerts />
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/help" element={<Help />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/tools/brandability-score" element={<BrandabilityScorePage />} />
                <Route path="/tools/domain-generator" element={<ProtectedRoute><DomainGeneratorPage /></ProtectedRoute>} />
                
                <Route path="/tools/pronounceability" element={<PronounceabilityPage />} />
                <Route path="/tools/bulk-checker" element={<BulkCheckerPage />} />
                <Route path="/tools/tld-compare" element={<TldComparePage />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/methodology" element={<Methodology />} />
                <Route path="/report/:reportId" element={<SharedReport />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <CookieConsent />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
