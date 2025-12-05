const BASE = "http://localhost:5001";

export async function fetchPDB(project: string, role: string, pdb: string) {
  const form = new FormData();
  form.append("project", project);
  form.append("role", role);
  form.append("pdbCode", pdb);
  const res = await fetch(`${BASE}/fetch`, { method: "POST", body: form });
  return res.json();
}

export async function uploadFile(project: string, role: string, file: File) {
  const form = new FormData();
  form.append("project", project);
  form.append("role", role);
  form.append("file", file);

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: form
  });

  return res.json();
}


export async function predict(project: string, role: string, sequence: string) {
  const form = new FormData();
  form.append("project", project);
  form.append("role", role);
  form.append("sequence", sequence);
  const res = await fetch(`${BASE}/predict`, { method: "POST", body: form });
  return res.json();
}

export async function clean(project: string, rec: string, bin: string) {
  const fd = new FormData();
  fd.append("project", project);
  fd.append("rec", rec);
  fd.append("bin", bin);
  const res = await fetch(`${BASE}/clean`, { method: "POST", body: fd });
  return res.json();
}

export async function normalize(project: string, rec: string, bin: string) {
  const fd = new FormData();
  fd.append("project", project);
  fd.append("rec", rec);
  fd.append("bin", bin);
  const res = await fetch(`${BASE}/normalize`, { method: "POST", body: fd });
  return res.json();
}

export async function sanitize(project: string, rec: string, bin: string) {
  const fd = new FormData();
  fd.append("project", project);
  fd.append("rec", rec);
  fd.append("bin", bin);
  const res = await fetch(`${BASE}/sanitize`, { method: "POST", body: fd });
  return res.json();
}

export async function merge(project: string, rec: string, bin: string) {
  const fd = new FormData();
  fd.append("project", project);
  fd.append("rec", rec);
  fd.append("bin", bin);
  const res = await fetch(`${BASE}/merge`, { method: "POST", body: fd });
  return res.json();
}

export async function dock(project: string, nstruct: number = 10) {
  const fd = new FormData();
  fd.append("project", project);
  fd.append("nstruct", nstruct.toString());
  const res = await fetch(`${BASE}/dock`, { method: "POST", body: fd });
  return res.json();
}

// Types for streaming callbacks
export interface DockingProgress {
  current: number;
  total: number;
  percent: number;
}

export interface DockingScore {
  score: number;
  desc: string;
  line: string;
}

export interface DockingResult {
  bestScore: number;
  bestModel: string;
  pdbPath: string;
  index: number;
  allModels?: Array<{
    score: number;
    total_score: number;
    rms?: number;
    CAPRI_rank?: number;
    Fnat?: number;
    I_sc?: number;
    Irms?: number;
    Irms_leg?: number;
    cen_rms?: number;
    dslf_fa13?: number;
    fa_atr?: number;
    fa_dun?: number;
    fa_elec?: number;
    fa_intra_rep?: number;
    fa_intra_sol_xover4?: number;
    fa_rep?: number;
    fa_sol?: number;
    hbond_bb_sc?: number;
    hbond_lr_bb?: number;
    hbond_sc?: number;
    hbond_sr_bb?: number;
    lk_ball_wtd?: number;
    omega?: number;
    p_aa_pp?: number;
    pro_close?: number;
    rama_prepro?: number;
    ref?: number;
    st_rmsd?: number;
    yhh_planarity?: number;
    desc: string;
    index: number | null;
    pdb_path: string | null;
    [key: string]: any;
  }>;
}

export interface DockingCallbacks {
  onStart?: (data: { total: number; message: string }) => void;
  onProgress?: (data: DockingProgress) => void;
  onScore?: (data: DockingScore) => void;
  onComplete?: (result: DockingResult) => void;
  onError?: (error: string) => void;
}

/**
 * Run docking with real-time progress streaming via SSE
 */
export async function dockWithProgress(
  project: string,
  nstruct: number,
  callbacks: DockingCallbacks
): Promise<void> {
  const formData = new FormData();
  formData.append('project', project);
  formData.append('nstruct', nstruct.toString());

  const response = await fetch(`${BASE}/dock-stream`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    callbacks.onError?.(error);
    return;
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    callbacks.onError?.('Failed to start stream');
    return;
  }

  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE messages
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete message in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'start':
                console.log('SSE: start event', data);
                callbacks.onStart?.(data);
                break;
              case 'progress':
                console.log('SSE: progress event', data);
                callbacks.onProgress?.(data);
                break;
              case 'score':
                console.log('SSE: score event', data);
                callbacks.onScore?.(data);
                break;
              case 'complete':
                console.log('SSE: complete event', data);
                callbacks.onComplete?.(data);
                break;
              case 'error':
                console.error('SSE: error event', data);
                callbacks.onError?.(data.message);
                break;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', line, e);
          }
        }
      }
    }
  } catch (error) {
    callbacks.onError?.(String(error));
  }
}

/**
 * Cancel a running docking job
 */
export async function cancelDocking(project: string): Promise<{ status: string }> {
  const fd = new FormData();
  fd.append("project", project);
  const res = await fetch(`${BASE}/dock-cancel`, { method: "POST", body: fd });
  return res.json();
}

export async function visualize(project: string, pdb?: string) {
  const fd = new FormData();
  fd.append("project", project);
  if (pdb) fd.append("pdb", pdb);
  const res = await fetch(`${BASE}/visualize`, { method: "POST", body: fd });
  return res.json();
}

