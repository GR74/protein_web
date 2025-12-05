import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, BarChart3 } from 'lucide-react';
import type { DockingModel } from '@/types/docking';

interface DockingScoreChartProps {
  models: DockingModel[];
}

export function DockingScoreChart({ models }: DockingScoreChartProps) {
  const chartData = useMemo(() => {
    return models
      .filter(m => m.score !== undefined && m.index !== undefined)
      .map(m => ({
        index: m.index ?? 0,
        score: m.score,
        rank: models.indexOf(m) + 1,
      }))
      .sort((a, b) => a.index - b.index);
  }, [models]);

  const scoreDistribution = useMemo(() => {
    if (models.length === 0) return [];
    
    const minScore = Math.min(...models.map(m => m.score));
    const maxScore = Math.max(...models.map(m => m.score));
    const range = maxScore - minScore;
    const bins = 10;
    const binSize = range / bins;
    
    const distribution = Array(bins).fill(0).map((_, i) => ({
      bin: i + 1,
      range: `${(minScore + i * binSize).toFixed(0)} to ${(minScore + (i + 1) * binSize).toFixed(0)}`,
      count: 0,
    }));
    
    models.forEach(m => {
      const binIndex = Math.min(
        Math.floor((m.score - minScore) / binSize),
        bins - 1
      );
      distribution[binIndex].count++;
    });
    
    return distribution;
  }, [models]);

  if (models.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      {/* Score Trend Chart */}
      <Card className="glass-strong animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Score Trend</CardTitle>
          </div>
          <CardDescription>
            Lower scores indicate better docking models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
              <XAxis 
                dataKey="index" 
                label={{ value: 'Model Index', position: 'insideBottom', offset: -5 }}
                stroke="hsl(var(--muted-foreground) / 0.6)"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                stroke="hsl(var(--muted-foreground) / 0.6)"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value.toFixed(2), 'Score']}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Score Distribution */}
      <Card className="glass-strong animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Score Distribution</CardTitle>
          </div>
          <CardDescription>
            Distribution of scores across all models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
              <XAxis 
                dataKey="bin"
                label={{ value: 'Score Range', position: 'insideBottom', offset: -5 }}
                stroke="hsl(var(--muted-foreground) / 0.6)"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                stroke="hsl(var(--muted-foreground) / 0.6)"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(label, payload) => 
                  payload && payload[0] ? payload[0].payload.range : `Bin ${label}`
                }
                formatter={(value: number) => [value, 'Models']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="hsl(var(--success) / 0.3)"
                fillOpacity={0.6}
                dot={{ fill: 'hsl(var(--success))', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

