import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server } from "lucide-react";
import type { PortfolioDomain } from "@/hooks/usePortfolio";

// Known NS provider patterns
const NS_PROVIDERS: [string, RegExp][] = [
  ["Cloudflare", /cloudflare/i],
  ["GoDaddy", /domaincontrol\.com|godaddy/i],
  ["Namecheap", /registrar-servers\.com|namecheaphosting/i],
  ["AWS Route 53", /awsdns/i],
  ["Google", /googledomains|google\.com/i],
  ["Dynadot", /dynadot/i],
  ["Sedo", /sedo\.com/i],
  ["Porkbun", /porkbun/i],
  ["Spaceship", /spaceship/i],
  ["Hostinger", /hostinger/i],
  ["DigitalOcean", /digitalocean/i],
  ["Hetzner", /hetzner/i],
  ["Dan.com", /dan\.com|undeveloped/i],
  ["Afternic", /afternic/i],
  ["Epik", /epik\.com/i],
  ["Squarespace", /squarespace|googledomains/i],
  ["Wix", /wixdns/i],
  ["Vercel", /vercel-dns/i],
  ["Netlify", /netlify/i],
];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(160, 60%, 45%)",
  "hsl(220, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(30, 80%, 55%)",
  "hsl(340, 70%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(50, 80%, 50%)",
  "hsl(100, 50%, 45%)",
  "hsl(0, 60%, 55%)",
];

function identifyProvider(nameservers: string[]): string {
  for (const ns of nameservers) {
    for (const [name, pattern] of NS_PROVIDERS) {
      if (pattern.test(ns)) return name;
    }
  }
  // Fall back to the root domain of the first NS
  if (nameservers.length > 0) {
    const parts = nameservers[0].split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
  }
  return "Unknown";
}

interface Props {
  domains: PortfolioDomain[];
}

export function NameserverChart({ domains }: Props) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    let noNs = 0;

    for (const d of domains) {
      if (d.status === "sold") continue;
      if (!d.nameservers || d.nameservers.length === 0) {
        noNs++;
        continue;
      }
      const provider = identifyProvider(d.nameservers);
      counts[provider] = (counts[provider] || 0) + 1;
    }

    if (noNs > 0) {
      counts["Not looked up"] = noNs;
    }

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [domains]);

  if (data.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Server className="w-4 h-4 text-muted-foreground" />
          Nameserver Providers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [`${value} domain${value !== 1 ? "s" : ""}`, name]}
              />
              <Legend
                verticalAlign="bottom"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
