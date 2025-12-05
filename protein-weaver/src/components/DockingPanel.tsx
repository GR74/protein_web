import { useState, useEffect, useRef } from 'react';
import { Play, FileCode, Settings, Trophy, Eye, ChevronDown, ChevronUp, Square, Zap, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SortableTable } from '@/components/SortableTable';
import { EnhancedProgress } from '@/components/EnhancedProgress';
import { TableSkeleton, ResultsSkeleton } from '@/components/SkeletonLoader';
import { DockingScoreChart } from '@/components/DockingScoreChart';
import { EmptyDockingResults } from '@/components/EmptyState';
import { useToast } from '@/hooks/use-toast';
import type { DockingState } from '@/types/docking';

interface DockingPanelProps {
  dockingState: DockingState;
  canDock: boolean;
  optionsContent: string;
  xmlContent: string;
  onOptionsChange: (content: string) => void;
  onRunDocking: () => void;
  onVisualize: () => void;
  onCancelDocking?: () => void;
  liveScores?: Array<{ score: number; desc: string }>;
  currentStructure?: number;
  totalStructures?: number;
  dockingStartTime?: Date;
}

export function DockingPanel({
  dockingState,
  canDock,
  optionsContent,
  xmlContent,
  onOptionsChange,
  onRunDocking,
  onVisualize,
  onCancelDocking,
  liveScores = [],
  currentStructure = 0,
  totalStructures = 0,
  dockingStartTime,
}: DockingPanelProps) {
  const { toast } = useToast();
  const [showOptions, setShowOptions] = useState(false);
  const [showXml, setShowXml] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const isRunning = dockingState.status === 'running';
  const isComplete = dockingState.status === 'complete';

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [dockingState.logs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          isComplete 
            ? 'bg-success text-success-foreground' 
            : 'bg-primary text-primary-foreground'
        }`}>
          3
        </div>
        <h2 className="font-semibold">Docking</h2>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <Play className="w-4 h-4" />
          <span>Rosetta Docking</span>
        </div>
        <div className="p-4 space-y-4">
          {/* Options File */}
          <Collapsible open={showOptions} onOpenChange={setShowOptions}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>docking.options.txt</span>
                  <span className="text-xs text-muted-foreground">(editable)</span>
                </div>
                {showOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                value={optionsContent}
                onChange={(e) => onOptionsChange(e.target.value)}
                className="font-mono text-xs h-48 resize-none"
                placeholder="Docking options will appear here..."
              />
            </CollapsibleContent>
          </Collapsible>

          {/* XML Protocol */}
          <Collapsible open={showXml} onOpenChange={setShowXml}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  <span>docking_full.xml</span>
                  <span className="text-xs text-muted-foreground">(read-only)</span>
                </div>
                {showXml ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                value={xmlContent}
                readOnly
                className="font-mono text-xs h-48 resize-none bg-muted"
                placeholder="XML protocol will appear here..."
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Run Button */}
          <Button
            className={`w-full h-14 text-lg shadow-xl transition-all duration-300 ${
              isRunning 
                ? 'bg-primary/80' 
                : 'hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1'
            }`}
            size="lg"
            disabled={!canDock || isRunning}
            onClick={onRunDocking}
          >
            {isRunning ? (
              <>
                <div className="w-5 h-5 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Running Docking...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span style={{ fontFamily: 'Oswald, sans-serif' }}>Run Rosetta Docking</span>
              </>
            )}
          </Button>

          {/* Enhanced Progress */}
          {isRunning && (
            <div className="space-y-4">
              <EnhancedProgress
                current={currentStructure}
                total={totalStructures}
                startTime={dockingStartTime}
                label="Docking in progress"
              />

              {/* Live Scores */}
              {liveScores.length > 0 && (
                <div className="p-3 bg-card rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-warning" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Live Scores</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {liveScores.slice(-5).map((s, i) => (
                      <div key={i} className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground truncate">{s.desc}</span>
                        <span className={`font-bold ${s.score < -200 ? 'text-success' : s.score < -100 ? 'text-warning' : 'text-foreground'}`}>
                          {s.score.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancel Button */}
              {onCancelDocking && (
                <Button
                  variant="outline"
                  className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={onCancelDocking}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Cancel Docking
                </Button>
              )}
              
              <p className="text-xs text-muted-foreground text-center">
                This may take several minutes depending on protein size and nstruct value
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Log Output */}
      <div className="panel-card">
        <div className="panel-header">
          <span>Docking Log</span>
          {dockingState.logs.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {dockingState.logs.length} entries
            </span>
          )}
          {isRunning && (
            <div className="w-2 h-2 rounded-full bg-success animate-pulse ml-2" />
          )}
        </div>
        <div ref={logContainerRef} className="log-container">
          {dockingState.logs.length === 0 ? (
            <span className="text-muted-foreground">Waiting for docking to start...</span>
          ) : (
            dockingState.logs.map((log, i) => (
              <div 
                key={i} 
                className={`py-0.5 ${
                  log.includes('✅') ? 'text-success' : 
                  log.includes('❌') ? 'text-destructive' :
                  log.includes('SCORE:') ? 'text-primary font-semibold' :
                  ''
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Results */}
      {isComplete && dockingState.bestScore && (
        <>
          <div className="panel-card border-2 border-success/40 overflow-hidden shadow-glow-success animate-scale-in">
            <div className="panel-header bg-gradient-success text-white shadow-layered">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/20">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg">Docking Complete!</span>
              </div>
            </div>
            <div className="p-6 space-y-5 bg-gradient-to-br from-success/8 via-success/5 to-success/3">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 glass rounded-xl border-2 border-success/30 shadow-layered hover:shadow-glow-success transition-smooth">
                  <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-bold">Best Score</p>
                  <p className="text-4xl font-extrabold font-mono text-gradient-success animate-fade-in" style={{ fontFamily: 'Oswald, sans-serif' }}>
                    {dockingState.bestScore.toFixed(2)}
                  </p>
                </div>
                <div className="p-5 glass rounded-xl border-2 border-border/50 shadow-layered hover-lift">
                  <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-bold">Best Model</p>
                  <p className="text-sm font-mono truncate text-foreground font-semibold">{dockingState.bestModel}</p>
                </div>
              </div>
              <Button
                className="w-full h-12 text-base bg-gradient-success hover:shadow-glow-success transition-smooth hover:scale-105 font-bold"
                onClick={onVisualize}
              >
                <Eye className="w-5 h-5 mr-2" />
                Visualize in PyMOL
              </Button>
            </div>
          </div>

          {/* Score Charts */}
          {isComplete && dockingState.allModels && dockingState.allModels.length > 0 && (
            <DockingScoreChart models={dockingState.allModels} />
          )}

          {/* Enhanced Results Table */}
          {isComplete && dockingState.allModels && dockingState.allModels.length > 0 ? (
            <div className="panel-card animate-fade-in">
              <div className="panel-header bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/20 text-primary shadow-layered">
                    <Table2 className="w-4 h-4" />
                  </div>
                  <span className="font-bold">All Docking Results</span>
                </div>
                <span className="text-xs text-muted-foreground ml-auto bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 font-semibold">
                  {dockingState.allModels.length} models
                </span>
              </div>
              <div className="p-6">
                <SortableTable
                  models={dockingState.allModels}
                  bestModelDesc={dockingState.bestModel}
                  onExport={() => toast({ title: 'Exported!', description: 'Results saved to CSV file' })}
                />
              </div>
            </div>
          ) : isComplete && !dockingState.allModels ? (
            <ResultsSkeleton />
          ) : isComplete && dockingState.allModels?.length === 0 ? (
            <EmptyDockingResults />
          ) : null}
        </>
      )}
    </div>
  );
}
