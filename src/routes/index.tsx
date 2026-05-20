import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, Film, Image as ImageIcon, Zap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen text-foreground" style={{ background: "var(--gradient-hero)" }}>
      {/* Nav */}
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          VideoForge AI
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link to="/auth">
            <Button className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              Começar grátis
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-20 text-center md:py-32">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-sm backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Potencializado por fal.ai e Lovable AI</span>
        </div>
        <h1 className="mx-auto max-w-4xl text-balance text-5xl font-bold tracking-tight md:text-7xl">
          Transforme prompts em{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
            vídeos cinematográficos
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Escreva uma ideia e receba um vídeo finalizado com roteiro, imagens, clipes e áudio — pronto para baixar e publicar.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="text-primary-foreground" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
              Criar meu primeiro vídeo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline">Ver demonstração</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto grid gap-6 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: Wand2, title: "Roteiro automático", desc: "Sua ideia vira um roteiro completo dividido em cenas." },
          { icon: ImageIcon, title: "Imagens com IA", desc: "Cada cena ganha um visual único gerado em segundos." },
          { icon: Film, title: "Vídeo finalizado", desc: "Clipes animados, áudio e edição — tudo automático." },
          { icon: Zap, title: "Rápido e barato", desc: "Vídeos de até 5 minutos em poucos minutos." },
          { icon: Sparkles, title: "Sem expertise", desc: "Sem editar nada. Você só escreve o prompt." },
          { icon: Film, title: "Pronto pro feed", desc: "Exporta em 16:9, 9:16 ou 1:1 para qualquer rede." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur transition hover:border-primary/50">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} VideoForge AI
      </footer>
    </div>
  );
}
