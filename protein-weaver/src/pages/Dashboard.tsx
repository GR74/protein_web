import { Link } from 'react-router-dom';
import { 
  Dna, 
  Atom, 
  FlaskConical, 
  TestTube, 
  Zap, 
  ArrowRight,
  Beaker,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  status: 'available' | 'coming-soon';
  color?: string;
}

function ModuleCard({ title, description, icon, href, status, color = 'primary' }: ModuleCardProps) {
  const isAvailable = status === 'available';
  
  // Color mapping for static classes
  const colorClasses: Record<string, { bg: string; text: string; hover: string; border: string }> = {
    primary: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      hover: 'hover:bg-primary/90',
      border: 'hover:border-primary'
    },
    accent: {
      bg: 'bg-accent/10',
      text: 'text-accent',
      hover: 'hover:bg-accent/90',
      border: 'hover:border-accent'
    },
    secondary: {
      bg: 'bg-secondary/10',
      text: 'text-secondary-foreground',
      hover: 'hover:bg-secondary/90',
      border: 'hover:border-secondary'
    },
    success: {
      bg: 'bg-success/10',
      text: 'text-success',
      hover: 'hover:bg-success/90',
      border: 'hover:border-success'
    },
    warning: {
      bg: 'bg-warning/10',
      text: 'text-warning',
      hover: 'hover:bg-warning/90',
      border: 'hover:border-warning'
    }
  };
  
  const colors = colorClasses[color] || colorClasses.primary;
  
  if (isAvailable) {
    return (
      <Link to={href} className="block animate-fade-in">
        <Card className={`
          h-full glass hover-lift cursor-pointer
          border-2 border-border/50 hover:border-primary/50
          ${colors.border} shadow-layered hover:shadow-glow-primary
          bg-gradient-card
        `}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className={`
                p-4 rounded-xl ${colors.bg} ${colors.text}
                shadow-layered hover:shadow-glow-primary
                transition-smooth hover:scale-110
                bg-gradient-to-br ${colors.bg} ${colors.bg.replace('/10', '/15')}
              `}>
                {icon}
              </div>
            </div>
            <CardTitle className="mt-4 text-xl font-bold" style={{ fontFamily: 'Oswald, sans-serif' }}>
              {title}
            </CardTitle>
            <CardDescription className="text-sm mt-2 leading-relaxed">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full bg-gradient-scarlet hover:shadow-glow-primary transition-smooth hover:scale-105"
              style={{ fontFamily: 'Oswald, sans-serif' }}
            >
              Launch Tool
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </Link>
    );
  }
  
  return (
    <div className="animate-fade-in">
      <Card className="h-full opacity-70 cursor-not-allowed glass border-2 border-border/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className={`
              p-4 rounded-xl ${colors.bg} ${colors.text} opacity-60
              bg-gradient-to-br ${colors.bg} ${colors.bg.replace('/10', '/15')}
            `}>
              {icon}
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/80 px-3 py-1.5 rounded-full border border-border/50">
              Coming Soon
            </span>
          </div>
          <CardTitle className="mt-4 text-xl font-bold opacity-80" style={{ fontFamily: 'Oswald, sans-serif' }}>
            {title}
          </CardTitle>
          <CardDescription className="text-sm mt-2 leading-relaxed opacity-70">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full cursor-not-allowed opacity-50"
            disabled
          >
            Coming Soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const modules = [
    {
      title: 'Protein Docking',
      description: 'Perform protein-protein docking using Rosetta with real-time progress tracking and comprehensive results analysis.',
      icon: <Dna className="w-6 h-6" />,
      href: '/docking',
      status: 'available' as const,
      color: 'primary'
    },
    {
      title: 'Alanine Scanning',
      description: 'Systematically mutate residues to alanine to identify critical positions for protein function and binding.',
      icon: <TestTube className="w-6 h-6" />,
      href: '/alanine-scanning',
      status: 'coming-soon' as const,
      color: 'accent'
    },
    {
      title: 'NCAA Scanning',
      description: 'Scan non-canonical amino acid substitutions to explore expanded chemical space and novel protein properties.',
      icon: <Atom className="w-6 h-6" />,
      href: '/ncaa-scanning',
      status: 'coming-soon' as const,
      color: 'secondary'
    },
    {
      title: 'Ligand Docking',
      description: 'Dock small molecules and ligands to protein structures for drug discovery and binding site analysis.',
      icon: <FlaskConical className="w-6 h-6" />,
      href: '/ligand-docking',
      status: 'coming-soon' as const,
      color: 'success'
    },
    {
      title: 'Energy Calculations',
      description: 'Compute binding energies, ΔΔG values, and thermodynamic properties for protein complexes.',
      icon: <Zap className="w-6 h-6" />,
      href: '/energy-calculations',
      status: 'coming-soon' as const,
      color: 'warning'
    },
    {
      title: 'Structure Analysis',
      description: 'Analyze protein structures, interfaces, and interactions with advanced visualization tools.',
      icon: <Activity className="w-6 h-6" />,
      href: '/structure-analysis',
      status: 'coming-soon' as const,
      color: 'primary'
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative border-b glass-strong bg-gradient-to-r from-primary/5 via-card to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="animate-slide-in">
              <h1 
                className="text-4xl font-extrabold text-foreground mb-2"
                style={{ fontFamily: 'Oswald, sans-serif' }}
              >
                ProteinWeb Lab Suite
              </h1>
              <p className="text-muted-foreground text-base font-medium">
                Computational Biology Tools for Protein Analysis
              </p>
            </div>
            <div className="flex items-center gap-3 animate-scale-in">
              <ThemeToggle />
              <div className="p-3 rounded-xl bg-primary/10 text-primary shadow-layered">
                <Beaker className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-16 text-center animate-fade-in">
          <h2 
            className="text-5xl font-extrabold mb-6 text-gradient-scarlet"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Welcome to ProteinWeb
          </h2>
          <div className="w-24 h-1 bg-gradient-scarlet mx-auto mb-6 rounded-full" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A comprehensive suite of computational tools for protein structure analysis, 
            docking, and design. Select a module below to get started.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {modules.map((module) => (
            <ModuleCard key={module.href} {...module} />
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass hover-lift shadow-layered border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="font-bold">Fast & Efficient</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Real-time progress tracking and optimized workflows for rapid results.
              </p>
            </CardContent>
          </Card>

          <Card className="glass hover-lift shadow-layered border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="font-bold">Comprehensive Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Detailed results tables, scoring metrics, and visualization tools for in-depth analysis.
              </p>
            </CardContent>
          </Card>

          <Card className="glass hover-lift shadow-layered border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Beaker className="w-5 h-5" />
                </div>
                <span className="font-bold">Research-Grade</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built on Rosetta and industry-standard tools for reliable, publication-ready results.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Powered by <span className="font-bold text-primary">Rosetta</span></p>
        </footer>
      </main>
    </div>
  );
}

