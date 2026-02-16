import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PortfolioInsert } from "@/hooks/usePortfolio";

interface Props {
  onAdd: (domain: Partial<PortfolioInsert>) => Promise<void>;
}

export function AddDomainDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    domain_name: "",
    purchase_price: "",
    purchase_date: "",
    purchase_source: "",
    status: "holding",
    renewal_cost_yearly: "",
    next_renewal_date: "",
    notes: "",
    tags: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.domain_name.trim()) return;
    setSaving(true);
    await onAdd({
      domain_name: form.domain_name.trim().toLowerCase(),
      purchase_price: parseFloat(form.purchase_price) || 0,
      purchase_date: form.purchase_date || null,
      purchase_source: form.purchase_source || null,
      status: form.status,
      renewal_cost_yearly: parseFloat(form.renewal_cost_yearly) || 0,
      next_renewal_date: form.next_renewal_date || null,
      notes: form.notes || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
    });
    setSaving(false);
    setForm({ domain_name: "", purchase_price: "", purchase_date: "", purchase_source: "", status: "holding", renewal_cost_yearly: "", next_renewal_date: "", notes: "", tags: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Add Domain
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Domain to Portfolio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Domain Name *</Label>
              <Input placeholder="example.com" value={form.domain_name} onChange={(e) => setForm({ ...form, domain_name: e.target.value })} required />
            </div>
            <div>
              <Label>Purchase Price ($)</Label>
              <Input type="number" step="0.01" placeholder="0" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
            </div>
            <div>
              <Label>Source</Label>
              <Input placeholder="GoDaddy, Namecheap..." value={form.purchase_source} onChange={(e) => setForm({ ...form, purchase_source: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="holding">Holding</SelectItem>
                  <SelectItem value="listed">Listed for Sale</SelectItem>
                  <SelectItem value="developing">Developing</SelectItem>
                  <SelectItem value="parked">Parked</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Yearly Renewal ($)</Label>
              <Input type="number" step="0.01" placeholder="10" value={form.renewal_cost_yearly} onChange={(e) => setForm({ ...form, renewal_cost_yearly: e.target.value })} />
            </div>
            <div>
              <Label>Next Renewal</Label>
              <Input type="date" value={form.next_renewal_date} onChange={(e) => setForm({ ...form, next_renewal_date: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Tags (comma-separated)</Label>
              <Input placeholder="ai, tech, brandable" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea placeholder="Any notes about this domain..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Adding..." : "Add to Portfolio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
