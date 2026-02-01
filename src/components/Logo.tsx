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

const dimensions = {
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 48, height: 48 },
};

export function Logo({ className = "", size = "md" }: LogoProps) {
  const { width, height } = dimensions[size];
  return (
    <img 
      src={logoImage} 
      alt="ExpiredHawk Logo" 
      width={width}
      height={height}
      className={`${sizes[size]} rounded-lg ${className}`}
    />
  );
}
