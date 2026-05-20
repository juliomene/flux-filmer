import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, LayoutDashboard, Wand2, Film, Image as ImageIcon, Settings, LogOut, Menu, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/create", label: "Criar vídeo", icon: Wand2 },
  { to: "/projects", label: "Projetos", icon: Film },
  { to: "/images", label: "Imagens", icon: ImageIcon },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-border bg-card/30 px-4 py-3 backdrop-blur md:hidden">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            VideoForge
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("display_name, credits, avatar_url").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu da conta.");
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2 border-b border-sidebar-border px-6 py-5 font-bold">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        VideoForge AI
      </Link>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-3 flex items-center justify-between rounded-lg bg-sidebar-accent/40 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 text-sidebar-foreground/70">
            <Coins className="h-4 w-4 text-primary" /> Créditos
          </span>
          <span className="font-semibold">{profile?.credits ?? "—"}</span>
        </div>
        <div className="mb-2 truncate px-2 text-xs text-sidebar-foreground/60">
          {profile?.display_name ?? "Carregando…"}
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}