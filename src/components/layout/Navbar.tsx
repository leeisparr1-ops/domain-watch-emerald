import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, User, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border animate-in slide-in-from-top duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Logo size="md" />
            <span className="text-xl font-bold gradient-text">ExpiredHawk</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
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
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
              Home
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
              Pricing
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
                  Dashboard
                </Link>
                <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
                  Settings
                </Link>
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <HelpCircle className="w-4 h-4" />
                  Help
                </Link>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
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
                <Link to="/signup" onClick={() => setIsOpen(false)}>
                  <Button variant="hero" className="w-full">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
