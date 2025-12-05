import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock, Zap, TrendingUp } from 'lucide-react';

interface EnhancedProgressProps {
  current: number;
  total: number;
  startTime?: Date;
  label?: string;
}

export function EnhancedProgress({ current, total, startTime, label = 'Progress' }: EnhancedProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);

  // Start elapsed time immediately when startTime is set
  useEffect(() => {
    if (!startTime) return;

    // Update immediately
    const updateElapsed = () => {
      const now = new Date();
      const elapsedMs = now.getTime() - startTime.getTime();
      const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
      setElapsed(elapsedSec);

      // Calculate speed and ETA only if we have progress
      if (current > 0 && elapsedSec > 0) {
        const structuresPerSec = current / elapsedSec;
        setSpeed(structuresPerSec);

        // Calculate ETA
        if (structuresPerSec > 0 && total > current) {
          const remaining = total - current;
          const etaSec = Math.ceil(remaining / structuresPerSec);
          setEta(etaSec);
        } else {
          setEta(null);
        }
      } else {
        setSpeed(null);
        setEta(null);
      }
    };

    // Update immediately
    updateElapsed();

    // Then update every second
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [current, total, startTime]);

  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `0:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border-2 border-primary/20 shadow-layered">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          <span className="font-semibold text-foreground">{label}</span>
        </div>
        <span className="font-bold text-primary text-xl font-mono" style={{ fontFamily: 'Oswald, sans-serif' }}>
          {percent}%
        </span>
      </div>

      {/* Progress Bar */}
      <Progress value={percent} className="h-3" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Current/Total */}
        <div className="flex items-center gap-2 p-2 bg-card/50 rounded-lg border border-border/50">
          <TrendingUp className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-sm font-bold font-mono">
              {current} / {total}
            </p>
          </div>
        </div>

        {/* Elapsed Time */}
        {startTime && (
          <div className="flex items-center gap-2 p-2 bg-card/50 rounded-lg border border-border/50">
            <Clock className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Elapsed</p>
              <p className="text-sm font-bold font-mono">{formatElapsed(elapsed)}</p>
            </div>
          </div>
        )}

        {/* Placeholder for when elapsed time isn't showing yet */}
        {!startTime && (
          <div className="flex items-center gap-2 p-2 bg-card/50 rounded-lg border border-border/50 opacity-50">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Elapsed</p>
              <p className="text-sm font-bold font-mono">0:00</p>
            </div>
          </div>
        )}

        {/* Speed */}
        {speed !== null && (
          <div className="flex items-center gap-2 p-2 bg-card/50 rounded-lg border border-border/50">
            <Zap className="w-4 h-4 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Speed</p>
              <p className="text-sm font-bold font-mono">
                {speed.toFixed(2)}/s
              </p>
            </div>
          </div>
        )}

        {/* ETA */}
        {eta !== null && (
          <div className="flex items-center gap-2 p-2 bg-card/50 rounded-lg border border-border/50">
            <Clock className="w-4 h-4 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">ETA</p>
              <p className="text-sm font-bold font-mono">{formatTime(eta)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

