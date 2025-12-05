import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { StructureInputPanel } from '@/components/StructureInputPanel';
import { PreprocessingPanel } from '@/components/PreprocessingPanel';
import { DockingPanel } from '@/components/DockingPanel';
import { DownloadsPanel } from '@/components/DownloadsPanel';
import { useToast } from '@/hooks/use-toast';
import type {
  StructureInput,
  StructureRole,
  ProcessingState,
  DockingState,
  OutputFile,
} from '@/types/docking';
import * as api from '@/services/api';
import type { DockingScore } from '@/services/api';

const defaultStructure = (role: StructureRole): StructureInput => ({
  role,
  method: 'fetch',
  status: 'idle',
});

// Helper to generate project name
const generateProjectName = () => {
  const now = new Date();
  return `project_${now.toISOString().slice(0, 10).replace(/-/g, '')}_${now.getTime().toString(36)}`;
};

export default function Index() {
  const { toast } = useToast();

  // Project name - each project gets its own folder
  const [projectName, setProjectName] = useState(generateProjectName);

  // Docking parameters
  const [nstruct, setNstruct] = useState(10);

  // Working directory (still shown in Header; backend uses its own paths)
  const [workingDir, setWorkingDir] = useState('./inputs');

  // Structure inputs
  const [receptor, setReceptor] = useState<StructureInput>(defaultStructure('receptor'));
  const [binder, setBinder] = useState<StructureInput>(defaultStructure('binder'));

  // Processing state
  const [processingState, setProcessingState] = useState<ProcessingState>({
    clean: 'idle',
    normalize: 'idle',
    sanitize: 'idle',
    merge: 'idle',
  });
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  // Docking state
  const [dockingState, setDockingState] = useState<DockingState>({
    status: 'idle',
    progress: 0,
    logs: [],
  });

  // Live streaming state
  const [liveScores, setLiveScores] = useState<DockingScore[]>([]);
  const [currentStructure, setCurrentStructure] = useState(0);
  const [totalStructures, setTotalStructures] = useState(0);
  const [dockingStartTime, setDockingStartTime] = useState<Date | undefined>();

  // Reset everything for a new project
  const handleNewProject = useCallback(() => {
    // Generate new project name
    const newProjectName = generateProjectName();
    setProjectName(newProjectName);
    
    // Reset structure inputs
    setReceptor(defaultStructure('receptor'));
    setBinder(defaultStructure('binder'));
    
    // Reset processing state
    setProcessingState({
      clean: 'idle',
      normalize: 'idle',
      sanitize: 'idle',
      merge: 'idle',
    });
    setProcessingLogs([]);
    
    // Reset docking state
    setDockingState({
      status: 'idle',
      progress: 0,
      logs: [],
    });
    
    // Reset live streaming state
    setLiveScores([]);
    setCurrentStructure(0);
    setTotalStructures(0);
    
    // Clear output files
    setOutputFiles([]);
    
    toast({
      title: 'New Project Started',
      description: `Project: ${newProjectName}`,
    });
  }, [toast]);

  // Config content (currently just UI; backend /dock doesn’t read this yet)
  const [optionsContent, setOptionsContent] = useState(
    `-s complex_input.pdb
-parser:protocol docking_full.xml
-nstruct 10
-out:suffix _full`
  );

  const [xmlContent] = useState(`<ROSETTASCRIPTS>
  <SCOREFXNS>
    <ScoreFunction name="ref15" weights="ref15"/>
  </SCOREFXNS>
  <MOVERS>
    <DockingProtocol name="dock" low_res_protocol_only="0"/>
  </MOVERS>
  <PROTOCOLS>
    <Add mover="dock"/>
  </PROTOCOLS>
</ROSETTASCRIPTS>`);

  // Output files (for Downloads panel)
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);

  // Helpers
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const addDockingLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDockingState((prev) => ({
      ...prev,
      logs: [...prev.logs, `[${timestamp}] ${message}`],
    }));
  };

  const canProcess = receptor.status === 'ready' && binder.status === 'ready';
  const canDock = processingState.merge === 'complete';

  // ============================================================
  // STRUCTURE INPUT HANDLERS
  // ============================================================

  const handleFetch = useCallback(
    async (role: StructureRole, pdbCode: string) => {
      const setter = role === 'receptor' ? setReceptor : setBinder;
      setter((prev) => ({ ...prev, status: 'loading', pdbCode }));
      addLog(`Fetching ${pdbCode} for ${role}... (project: ${projectName})`);

      try {
        const result: any = await api.fetchPDB(projectName, role, pdbCode);

        const filePath =
          result.filePath ||
          result.file_path ||
          `${workingDir}/${pdbCode.toLowerCase()}.pdb`;

        setter((prev) => ({
          ...prev,
          status: 'ready',
          filePath,
        }));

        addLog(`✓ ${pdbCode} fetched successfully`);
        toast({
          title: 'PDB Fetched',
          description: `${pdbCode} downloaded for ${role}`,
        });
      } catch (err: any) {
        setter((prev) => ({ ...prev, status: 'error' }));
        addLog(`✗ Fetch error: ${err.message || String(err)}`);
        toast({
          title: 'Fetch failed',
          description: err.message || String(err),
          variant: 'destructive',
        });
      }
    },
    [workingDir, toast, projectName]
  );

  const handleUpload = useCallback(
    async (role: StructureRole, file: File) => {
      const setter = role === 'receptor' ? setReceptor : setBinder;
      setter((prev) => ({ ...prev, status: 'loading', file }));
      addLog(`Uploading ${file.name} for ${role}... (project: ${projectName})`);

      try{
        const result: any = await api.uploadFile(projectName, role, file);

        const filePath =
          result.filePath || result.file_path || `${workingDir}/${file.name}`;

        setter((prev) => ({
          ...prev,
          status: 'ready',
          filePath,
        }));

        addLog('✓ Upload successful');
        toast({
          title: 'File Uploaded',
          description: `${file.name} uploaded for ${role}`,
        });
      } catch (err: any) {
        setter((prev) => ({ ...prev, status: 'error' }));
        addLog(`✗ Upload failed: ${err.message || String(err)}`);
        toast({
          title: 'Upload failed',
          description: err.message || String(err),
          variant: 'destructive',
        });
      }
    },
    [workingDir, toast, projectName]
  );

  const handlePredict = useCallback(
    async (role: StructureRole, sequence: string) => {
      const setter = role === 'receptor' ? setReceptor : setBinder;
      setter((prev) => ({ ...prev, status: 'loading', sequence }));
      addLog(`Starting ColabFold prediction for ${role}... (project: ${projectName})`);
      addLog(`Sequence length: ${sequence.length} residues`);

      try {
        const result: any = await api.predict(projectName, role, sequence);

        const filePath =
          result.filePath ||
          result.file_path ||
          `${workingDir}/${role}_colabfold/ranked_0.pdb`;

        setter((prev) => ({
          ...prev,
          status: 'ready',
          filePath,
        }));

        addLog(`✓ ColabFold prediction complete for ${role}`);
        toast({
          title: 'Prediction Complete',
          description: `Structure predicted for ${role}`,
        });
      } catch (err: any) {
        setter((prev) => ({ ...prev, status: 'error' }));
        addLog(`✗ Prediction failed: ${err.message || String(err)}`);
        toast({
          title: 'Prediction failed',
          description: err.message || String(err),
          variant: 'destructive',
        });
      }
    },
    [workingDir, toast, projectName]
  );

  // ============================================================
  // PREPROCESSING HANDLERS
  // ============================================================

  const handleClean = useCallback(async () => {
    if (!receptor.filePath || !binder.filePath) {
      addLog('✗ Cannot clean: missing receptor or binder file path');
      return;
    }

    setProcessingState((prev) => ({ ...prev, clean: 'running' }));
    addLog('Running Rosetta clean_pdb.py...');

    try {
      const result: any = await api.clean(projectName, receptor.filePath, binder.filePath);

      // Optional: use returned paths if backend returns them
      const recClean =
        result.rec_clean ||
        result.rec ||
        `${workingDir}/receptor_clean.pdb`;
      const binClean =
        result.bin_clean ||
        result.bin ||
        `${workingDir}/binder_clean.pdb`;

      addLog('✓ Structures cleaned successfully');
      setProcessingState((prev) => ({ ...prev, clean: 'complete' }));

      // Register output files for download
      setOutputFiles((prev) => [
        ...prev,
        { name: 'receptor_clean.pdb', path: recClean, type: 'pdb' },
        { name: 'binder_clean.pdb', path: binClean, type: 'pdb' },
      ]);
    } catch (err: any) {
      setProcessingState((prev) => ({ ...prev, clean: 'error' }));
      addLog(`✗ Clean failed: ${err.message || String(err)}`);
      toast({
        title: 'Clean failed',
        description: err.message || String(err),
        variant: 'destructive',
      });
    }
  }, [receptor.filePath, binder.filePath, workingDir, toast, projectName]);

  const handleNormalize = useCallback(async () => {
    if (!receptor.filePath || !binder.filePath) {
      addLog('✗ Cannot normalize: missing receptor or binder file path');
      return;
    }

    setProcessingState((prev) => ({ ...prev, normalize: 'running' }));
    addLog('Normalizing chain IDs...');

    try {
      await api.normalize(projectName, receptor.filePath, binder.filePath);
      setProcessingState((prev) => ({ ...prev, normalize: 'complete' }));
      addLog('✓ Chain A assigned to receptor, Chain B to binder');
    } catch (err: any) {
      setProcessingState((prev) => ({ ...prev, normalize: 'error' }));
      addLog(`✗ Normalize failed: ${err.message || String(err)}`);
      toast({
        title: 'Normalize failed',
        description: err.message || String(err),
        variant: 'destructive',
      });
    }
  }, [receptor.filePath, binder.filePath, toast, projectName]);

  const handleSanitize = useCallback(async () => {
    if (!receptor.filePath || !binder.filePath) {
      addLog('✗ Cannot sanitize: missing receptor or binder file path');
      return;
    }

    setProcessingState((prev) => ({ ...prev, sanitize: 'running' }));
    addLog('Renumbering residues...');

    try {
      await api.sanitize(projectName, receptor.filePath, binder.filePath);
      setProcessingState((prev) => ({ ...prev, sanitize: 'complete' }));
      addLog('✓ Residue numbering fixed');
    } catch (err: any) {
      setProcessingState((prev) => ({ ...prev, sanitize: 'error' }));
      addLog(`✗ Sanitize failed: ${err.message || String(err)}`);
      toast({
        title: 'Sanitize failed',
        description: err.message || String(err),
        variant: 'destructive',
      });
    }
  }, [receptor.filePath, binder.filePath, toast, projectName]);

  const handleMerge = useCallback(async () => {
    if (!receptor.filePath || !binder.filePath) {
      addLog('✗ Cannot merge: missing receptor or binder file path');
      return;
    }

    setProcessingState((prev) => ({ ...prev, merge: 'running' }));
    addLog('Aligning structures with 2Å gap and merging...');

    try {
      const result: any = await api.merge(projectName, receptor.filePath, binder.filePath);

      const complexPath =
        result.output ||
        result.complex ||
        result.path ||
        `${workingDir}/complex_input.pdb`;

      setProcessingState((prev) => ({ ...prev, merge: 'complete' }));
      addLog(`✓ Complex merged → ${complexPath}`);

      setOutputFiles((prev) => [
        ...prev,
        { name: 'complex_input.pdb', path: complexPath, type: 'pdb' },
      ]);

      toast({
        title: 'Complex Ready',
        description: 'Structures merged successfully. Ready for docking.',
      });
    } catch (err: any) {
      setProcessingState((prev) => ({ ...prev, merge: 'error' }));
      addLog(`✗ Merge failed: ${err.message || String(err)}`);
      toast({
        title: 'Merge failed',
        description: err.message || String(err),
        variant: 'destructive',
      });
    }
  }, [receptor.filePath, binder.filePath, workingDir, toast, projectName]);

  // ============================================================
  // DOCKING HANDLERS
  // ============================================================

  const handleRunDocking = useCallback(async () => {
    // Reset state for new run
    const startTime = new Date();
    setDockingStartTime(startTime);
    setDockingState({
      status: 'running',
      progress: 0,
      logs: [],
    });
    setLiveScores([]);
    setCurrentStructure(0);
    setTotalStructures(nstruct);
    
    addDockingLog(`🚀 Launching Rosetta docking (nstruct=${nstruct}, project=${projectName})...`);

    try {
      await api.dockWithProgress(projectName, nstruct, {
        onStart: (data) => {
          addDockingLog(`📦 ${data.message}`);
          setTotalStructures(data.total);
        },
        onProgress: (data) => {
          setCurrentStructure(data.current);
          setDockingState((prev) => ({
            ...prev,
            progress: data.percent,
          }));
          addDockingLog(`⏳ Structure ${data.current}/${data.total} (${data.percent}%)`);
        },
        onScore: (data) => {
          setLiveScores((prev) => [...prev, data]);
          // Don't spam the log - only show occasionally
          if (data.score < -200) {
            addDockingLog(`🎯 Good score: ${data.score.toFixed(1)} (${data.desc})`);
          }
        },
        onComplete: (result) => {
          setDockingState((prev) => ({
            ...prev,
            status: 'complete',
            progress: 100,
            bestScore: result.bestScore,
            bestModel: result.bestModel,
            bestPdbPath: result.pdbPath,
            allModels: result.allModels,
          }));

          addDockingLog('✅ Docking complete!');
          addDockingLog(`🏆 Best score: ${result.bestScore.toFixed(2)} (${result.bestModel})`);

          // Register outputs for download
          setOutputFiles((prev) => [
            ...prev,
            {
              name: 'docking_full.log',
              path: `${workingDir}/${projectName}/docking_full.log`,
              type: 'log',
            },
            {
              name: result.bestModel + '.pdb',
              path: result.pdbPath,
              type: 'pdb',
            },
          ]);

          toast({
            title: 'Docking Complete! 🎉',
            description: `Best score: ${result.bestScore.toFixed(2)}`,
          });
        },
        onError: (error) => {
          setDockingState((prev) => ({ ...prev, status: 'error' }));
          addDockingLog(`❌ Docking failed: ${error}`);
          toast({
            title: 'Docking failed',
            description: error,
            variant: 'destructive',
          });
        },
      });
    } catch (err: any) {
      setDockingState((prev) => ({ ...prev, status: 'error' }));
      addDockingLog(`❌ Docking failed: ${err.message || String(err)}`);
      toast({
        title: 'Docking failed',
        description: err.message || String(err),
        variant: 'destructive',
      });
    }
  }, [workingDir, toast, projectName, nstruct]);

  const handleCancelDocking = useCallback(async () => {
    try {
      await api.cancelDocking(projectName);
      setDockingState((prev) => ({ ...prev, status: 'idle', progress: 0 }));
      addDockingLog('⏹️ Docking cancelled by user');
      toast({
        title: 'Docking Cancelled',
        description: 'The docking job was stopped.',
      });
    } catch (err: any) {
      addDockingLog(`⚠️ Failed to cancel: ${err.message || String(err)}`);
    }
  }, [projectName, toast]);

  const handleVisualize = useCallback(async () => {
    try {
      addDockingLog("Requesting PyMOL visualization (backend selects best model)");
  
      await api.visualize(projectName);
  
      toast({
        title: "Opening PyMOL",
        description: "Launching visualization on backend...",
      });
    } catch (err: any) {
      toast({
        title: "Visualization failed",
        description: err.message || String(err),
        variant: "destructive",
      });
      addDockingLog(`✗ Visualization failed: ${err.message || String(err)}`);
    }
  }, [toast, projectName]);
  
  

  // ============================================================
  // DOWNLOAD HANDLER
  // ============================================================

  const handleDownload = useCallback(
    (file: OutputFile) => {
      toast({
        title: 'Downloading',
        description: file.name,
      });
      // You can implement a download endpoint and replace this with:
      // window.open(`${BASE}/download?path=${encodeURIComponent(file.path)}`, "_blank");
      console.log('Download requested:', file);
    },
    [toast]
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Header
        workingDir={workingDir}
        onWorkingDirChange={setWorkingDir}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        nstruct={nstruct}
        onNstructChange={setNstruct}
        onNewProject={handleNewProject}
        showBackButton={true}
        backButtonLabel="Back to Dashboard"
      />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pipeline Progress Bar */}
        <div className="mb-8 p-4 bg-card/80 backdrop-blur rounded-2xl border-2 border-border shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <PipelineStep 
              number={1} 
              label="Input" 
              active={!canProcess}
              complete={canProcess}
            />
            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                style={{ width: canProcess ? '100%' : '0%' }}
              />
            </div>
            <PipelineStep 
              number={2} 
              label="Process" 
              active={canProcess && !canDock}
              complete={canDock}
            />
            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                style={{ width: canDock ? '100%' : '0%' }}
              />
            </div>
            <PipelineStep 
              number={3} 
              label="Dock" 
              active={canDock && dockingState.status !== 'complete'}
              complete={dockingState.status === 'complete'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel 1: Input */}
          <div className="transform transition-all duration-300 hover:scale-[1.01]">
            <StructureInputPanel
              receptor={receptor}
              binder={binder}
              onReceptorChange={(update) =>
                setReceptor((prev) => ({ ...prev, ...update }))
              }
              onBinderChange={(update) =>
                setBinder((prev) => ({ ...prev, ...update }))
              }
              onFetch={handleFetch}
              onUpload={handleUpload}
              onPredict={handlePredict}
            />
          </div>

          {/* Panel 2: Preprocessing */}
          <div className="transform transition-all duration-300 hover:scale-[1.01]">
            <PreprocessingPanel
              processingState={processingState}
              canProcess={canProcess}
              onClean={handleClean}
              onNormalize={handleNormalize}
              onSanitize={handleSanitize}
              onMerge={handleMerge}
              logs={processingLogs}
            />
          </div>

          {/* Panel 3: Docking */}
          <div className="transform transition-all duration-300 hover:scale-[1.01]">
            <DockingPanel
              dockingState={dockingState}
              canDock={canDock}
              optionsContent={optionsContent}
              xmlContent={xmlContent}
              onOptionsChange={setOptionsContent}
              onRunDocking={handleRunDocking}
              onVisualize={handleVisualize}
              onCancelDocking={handleCancelDocking}
              liveScores={liveScores}
              currentStructure={currentStructure}
              totalStructures={totalStructures}
              dockingStartTime={dockingStartTime}
            />
          </div>
        </div>

        {/* Downloads Section */}
        <div className="mt-8">
          <DownloadsPanel files={outputFiles} onDownload={handleDownload} />
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Powered by <span className="font-bold text-primary">Rosetta</span></p>
        </footer>
      </main>
    </div>
  );
}

// Pipeline Step Component
function PipelineStep({ number, label, active, complete }: { 
  number: number; 
  label: string; 
  active: boolean; 
  complete: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        className={`
          w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
          ${complete 
            ? 'bg-success text-white shadow-lg shadow-success/40' 
            : active 
              ? 'bg-primary text-white shadow-lg shadow-primary/40 animate-pulse' 
              : 'bg-muted text-muted-foreground'
          }
        `}
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        {complete ? '✓' : number}
      </div>
      <span className={`text-xs font-medium uppercase tracking-wider ${active || complete ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}
