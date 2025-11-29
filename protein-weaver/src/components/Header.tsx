import { Atom, FolderOpen, Settings, Plus, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  workingDir: string;
  onWorkingDirChange: (path: string) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  nstruct: number;
  onNstructChange: (n: number) => void;
  onNewProject: () => void;
  showBackButton?: boolean;
  backButtonLabel?: string;
}

export function Header({ 
  workingDir, 
  onWorkingDirChange, 
  projectName, 
  onProjectNameChange,
  nstruct,
  onNstructChange,
  onNewProject,
  showBackButton = false,
  backButtonLabel = 'Back to Dashboard',
}: HeaderProps) {
  const [tempDir, setTempDir] = useState(workingDir);
  const [tempProject, setTempProject] = useState(projectName);
  const [tempNstruct, setTempNstruct] = useState(nstruct);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    onWorkingDirChange(tempDir);
    onProjectNameChange(tempProject);
    onNstructChange(tempNstruct);
    setOpen(false);
  };

  return (
    <header className="relative bg-gradient-scarlet border-b-4 border-black/20 px-6 py-5 shadow-layered-lg overflow-hidden">
      {/* Subtle animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
      </div>
      
      <div className="relative max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border-2 border-white/30 shadow-glow-primary hover:scale-110 transition-smooth">
            <Atom className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-wider drop-shadow-md" style={{ fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase' }}>
              ProteinWeb Lab Suite
            </h1>
            <p className="text-xs text-white/80 font-medium tracking-wide mt-1">
              Project: <span className="font-mono text-white bg-black/30 px-2.5 py-1 rounded-md border border-white/20 shadow-layered">{projectName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle variant="header" />
          
          {/* Back Button */}
          {showBackButton && (
            <Link to="/">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 bg-white/10 hover:bg-white/25 text-white border border-white/30 hover:border-white/50 backdrop-blur-sm transition-smooth hover:scale-105 shadow-layered"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{backButtonLabel}</span>
              </Button>
            </Link>
          )}
          
          {/* New Project Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 bg-white text-primary hover:bg-white/95 font-bold shadow-layered-lg hover:shadow-glow-primary transition-smooth hover:scale-105"
            onClick={onNewProject}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Project</span>
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 bg-white/10 hover:bg-white/25 text-white border border-white/30 hover:border-white/50 backdrop-blur-sm transition-smooth hover:scale-105 shadow-layered">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Project Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={tempProject}
                  onChange={(e) => setTempProject(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                  placeholder="my_project"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Each project gets its own folder. Use only letters, numbers, underscores, and hyphens.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nstruct">Docking Structures (nstruct)</Label>
                <Input
                  id="nstruct"
                  type="number"
                  min={1}
                  max={1000}
                  value={tempNstruct}
                  onChange={(e) => setTempNstruct(Math.max(1, parseInt(e.target.value) || 1))}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Number of docking models to generate. More = better sampling but slower. (1-1000)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workdir">Working Directory (display only)</Label>
                <Input
                  id="workdir"
                  value={tempDir}
                  onChange={(e) => setTempDir(e.target.value)}
                  placeholder="/path/to/working/directory"
                  className="font-mono text-sm"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Base directory is configured on the backend.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </header>
  );
}
