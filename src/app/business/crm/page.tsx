"use client";

import * as React from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Tag,
  DollarSign,
  Calendar,
  ChevronDown,
  GripVertical,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface CrmContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  deals: CrmDeal[];
}

interface CrmDeal {
  id: string;
  title: string;
  amount: number | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
}

const PIPELINE_STAGES = [
  { key: "lead", label: "Lead", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { key: "negotiation", label: "Negotiation", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  { key: "closed_won", label: "Won", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { key: "closed_lost", label: "Lost", color: "bg-red-500/15 text-red-400 border-red-500/30" },
];

export default function CrmPage() {
  const [contacts, setContacts] = React.useState<CrmContact[]>([]);
  const [deals, setDeals] = React.useState<CrmDeal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"contacts" | "pipeline">("contacts");
  const [showAddContact, setShowAddContact] = React.useState(false);
  const [showAddDeal, setShowAddDeal] = React.useState(false);
  const [newContact, setNewContact] = React.useState({ name: "", email: "", phone: "", notes: "", tags: "" });
  const [newDeal, setNewDeal] = React.useState({ contactId: "", title: "", amount: "", status: "lead", dueDate: "" });
  const [selectedContact, setSelectedContact] = React.useState<string | null>(null);
  const businessId = "current";

  const loadContacts = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/business/${businessId}/crm?${params}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setContacts(json.data?.contacts ?? json.contacts ?? []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [search]);

  const loadDeals = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/business/${businessId}/crm/deals`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setDeals(json.data?.deals ?? json.deals ?? []);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    loadContacts();
    loadDeals();
  }, [loadContacts, loadDeals]);

  const handleAddContact = async () => {
    if (!newContact.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const res = await fetch(`/api/business/${businessId}/crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newContact.name.trim(),
          email: newContact.email || undefined,
          phone: newContact.phone || undefined,
          notes: newContact.notes || undefined,
          tags: newContact.tags ? newContact.tags.split(",").map((t) => t.trim()) : [],
        }),
      });
      if (res.ok) {
        toast.success("Contact created");
        setShowAddContact(false);
        setNewContact({ name: "", email: "", phone: "", notes: "", tags: "" });
        loadContacts();
      }
    } catch {
      toast.error("Failed to create contact");
    }
  };

  const handleAddDeal = async () => {
    if (!newDeal.contactId || !newDeal.title.trim()) {
      toast.error("Contact and title are required");
      return;
    }
    try {
      const res = await fetch(`/api/business/${businessId}/crm/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contactId: newDeal.contactId,
          title: newDeal.title.trim(),
          amount: newDeal.amount ? Number(newDeal.amount) : undefined,
          status: newDeal.status,
          dueDate: newDeal.dueDate || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Deal created");
        setShowAddDeal(false);
        setNewDeal({ contactId: "", title: "", amount: "", status: "lead", dueDate: "" });
        loadDeals();
      }
    } catch {
      toast.error("Failed to create deal");
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">CRM</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAddContact(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
          <button
            type="button"
            onClick={() => setShowAddDeal(true)}
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Add Deal
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border p-1">
        {(["contacts", "pipeline"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {t === "contacts" ? "Contacts" : "Pipeline"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="pl-9"
        />
      </div>

      {/* Contacts View */}
      {tab === "contacts" && (
        <div className="rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading...
              </div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No contacts found</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`p-4 hover:bg-accent/30 cursor-pointer ${selectedContact === contact.id ? "bg-accent/50" : ""}`}
                  onClick={() => setSelectedContact(selectedContact === contact.id ? null : contact.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {contact.deals.length > 0 && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                          {contact.deals.length} deals
                        </span>
                      )}
                    </div>
                  </div>
                  {contact.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {contact.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedContact === contact.id && contact.deals.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {contact.deals.map((deal) => (
                        <div key={deal.id} className="flex items-center justify-between rounded border border-border p-2 text-xs">
                          <span>{deal.title}</span>
                          <div className="flex items-center gap-2">
                            {deal.amount && <span className="text-muted-foreground">${deal.amount.toLocaleString()}</span>}
                            <span className={`rounded-full border px-2 py-0.5 ${PIPELINE_STAGES.find((s) => s.key === deal.status)?.color ?? ""}`}>
                              {PIPELINE_STAGES.find((s) => s.key === deal.status)?.label ?? deal.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pipeline View */}
      {tab === "pipeline" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.status === stage.key);
            return (
              <div key={stage.key} className="rounded-lg border border-border">
                <div className="border-b border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${stage.color}`}>
                      {stage.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                  </div>
                </div>
                <div className="space-y-2 p-2">
                  {stageDeals.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">No deals</p>
                  ) : (
                    stageDeals.map((deal) => (
                      <div key={deal.id} className="rounded border border-border bg-card p-3">
                        <p className="text-sm font-medium">{deal.title}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          {deal.amount && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {deal.amount.toLocaleString()}
                            </span>
                          )}
                          {deal.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(deal.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Contact</h2>
              <button type="button" onClick={() => setShowAddContact(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                <Input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="John Doe" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} placeholder="john@example.com" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                <Input value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="+1 234 567 890" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <Input value={newContact.notes} onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })} placeholder="Any notes..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tags (comma separated)</label>
                <Input value={newContact.tags} onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })} placeholder="vip, enterprise" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddContact(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
                Cancel
              </button>
              <button type="button" onClick={handleAddContact} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {showAddDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Deal</h2>
              <button type="button" onClick={() => setShowAddDeal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Contact *</label>
                <select
                  value={newDeal.contactId}
                  onChange={(e) => setNewDeal({ ...newDeal, contactId: e.target.value })}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="">Select contact</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                <Input value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} placeholder="Deal title" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                <Input type="number" value={newDeal.amount} onChange={(e) => setNewDeal({ ...newDeal, amount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select
                  value={newDeal.status}
                  onChange={(e) => setNewDeal({ ...newDeal, status: e.target.value })}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                <Input type="date" value={newDeal.dueDate} onChange={(e) => setNewDeal({ ...newDeal, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddDeal(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
                Cancel
              </button>
              <button type="button" onClick={handleAddDeal} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
