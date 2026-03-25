import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, User, HelpCircle, Briefcase, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const ALLOWED_PORTFOLIO_USER = "6d33186f-d827-44cf-99e5-45a14f1c8c70";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const showPortfolio = user?.id === ALLOWED_PORTFOLIO_USER;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <Logo size="md" />
            <span className="text-xl font-bold gradient-text whitespace-nowrap">ExpiredHawk</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-5 ml-auto">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/tools" className="text-muted-foreground hover:text-foreground transition-colors">
              Tools
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                {showPortfolio && (
                  <Link to="/portfolio" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    Portfolio
                  </Link>
                )}
                <Link to="/drops" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Drops
                </Link>
                <Link to="/settings">
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </Link>
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <HelpCircle className="w-4 h-4" />
                  Help
                </Link>
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <HelpCircle className="w-4 h-4" />
                  Help
                </Link>
                <ThemeToggle />
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="hero" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-background border-t border-border animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
              Home
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
              Pricing
            </Link>
            <Link to="/tools" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
              Tools
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
                  Dashboard
                </Link>
                {showPortfolio && (
                  <Link to="/portfolio" className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2" onClick={() => setIsOpen(false)}>
                    <Briefcase className="w-4 h-4" />
                    Portfolio
                  </Link>
                )}
                <Link to="/drops" className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <Zap className="w-4 h-4" />
                  Drops
                </Link>
                <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
                  Settings
                </Link>
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <HelpCircle className="w-4 h-4" />
                  Help
                </Link>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Button variant="outline" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <HelpCircle className="w-4 h-4" />
                  Help
                </Link>
                <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Link to="/signup" onClick={() => setIsOpen(false)}>
                    <Button variant="hero" className="w-full">Get Started</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
