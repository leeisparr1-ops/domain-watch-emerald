import logoImage from "@/assets/logo.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function Logo({ className = "", size = "md" }: LogoProps) {
  return (
    <img 
      src={logoImage} 
      alt="ExpiredHawk Logo" 
      className={`${sizes[size]} rounded-lg ${className}`}
    />
  );
}
