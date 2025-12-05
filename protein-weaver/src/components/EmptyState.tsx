import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon, BarChart3, Upload, Settings } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, illustration }: EmptyStateProps) {
  return (
    <Card className="glass-strong border-2 border-dashed border-border/50 animate-fade-in">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        {illustration ? (
          <div className="mb-6 animate-float">
            {illustration}
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 animate-pulse-glow">
            <Icon className="w-10 h-10 text-primary" />
          </div>
        )}
        
        <CardTitle className="text-2xl mb-2 text-gradient-scarlet" style={{ fontFamily: 'Oswald, sans-serif' }}>
          {title}
        </CardTitle>
        
        <CardDescription className="text-base max-w-md mb-6">
          {description}
        </CardDescription>
        
        {action && (
          <Button
            onClick={action.onClick}
            className="btn-gradient-primary hover-lift"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Specific empty states for common scenarios
export function EmptyDockingResults() {
  return (
    <EmptyState
      icon={BarChart3}
      title="No Docking Results Yet"
      description="Run docking to see results and visualizations. Your docking models will appear here with detailed scores and metrics."
    />
  );
}

export function EmptyStructureInput({ onAction }: { onAction: () => void }) {
  return (
    <EmptyState
      icon={Upload}
      title="Add Structure Files"
      description="Upload PDB files, fetch from the PDB database, or predict structures from sequences to get started."
      action={{
        label: "Add Structure",
        onClick: onAction,
      }}
    />
  );
}

export function EmptyPreprocessing({ onAction }: { onAction: () => void }) {
  return (
    <EmptyState
      icon={Settings}
      title="Ready to Preprocess"
      description="Add both receptor and binder structures, then run preprocessing steps to prepare for docking."
      action={{
        label: "Add Structures",
        onClick: onAction,
      }}
    />
  );
}

