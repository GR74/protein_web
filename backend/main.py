from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pathlib import Path
import shutil
import tempfile
import asyncio
import json
import subprocess
import re

from pipeline import (
    fetch_pdb, copy_uploaded_pdb, write_fasta, run_colabfold,
    run_clean_pdb, normalize_chains, sanitize_pdb,
    combine_in_python, run_docking, parse_fasc_and_find_best,
    parse_fasc_all_models, visualize_best_model
)

app = FastAPI()

# --------------------------
# CORS (Vite frontend)
# --------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

WORKDIR = Path("/home/gowrishr74/app_test")  # CHANGE IF NEEDED


def get_project_dir(project: str) -> Path:
    """Get or create project directory."""
    project_dir = WORKDIR / project
    project_dir.mkdir(parents=True, exist_ok=True)
    return project_dir


# ---------- INPUT STRUCTURES ----------
@app.post("/fetch")
async def api_fetch(project: str = Form(...), role: str = Form(...), pdbCode: str = Form(...)):
    project_dir = get_project_dir(project)
    outdir = project_dir / role
    outdir.mkdir(parents=True, exist_ok=True)
    
    path = fetch_pdb(pdbCode, outdir)
    return { "path": str(path), "filePath": str(path), "project": project }


@app.post("/upload")
async def api_upload(project: str = Form(...), role: str = Form(...), file: UploadFile = File(...)):
    project_dir = get_project_dir(project)
    outdir = project_dir / role
    outdir.mkdir(parents=True, exist_ok=True)

    out = outdir / file.filename
    with out.open("wb") as f:
        f.write(await file.read())

    return {"path": str(out), "filePath": str(out), "project": project}


@app.post("/predict")
async def api_predict(project: str = Form(...), role: str = Form(...), sequence: str = Form(...)):
    project_dir = get_project_dir(project)
    outdir = project_dir / f"{role}_colabfold"
    with tempfile.TemporaryDirectory() as tmp:
        fasta = write_fasta(sequence.strip(), Path(tmp), role)
        pdb = run_colabfold(fasta, outdir)
    return { "path": str(pdb), "filePath": str(pdb), "project": project }


# ----------- PREPROCESSING -----------
@app.post("/clean")
async def api_clean(project: str = Form(...), rec: str = Form(...), bin: str = Form(...)):
    project_dir = get_project_dir(project)
    rec_out = project_dir / "receptor_clean.pdb"
    bin_out = project_dir / "binder_clean.pdb"
    run_clean_pdb(Path(rec), rec_out)
    run_clean_pdb(Path(bin), bin_out)
    return { "rec": str(rec_out), "bin": str(bin_out), "project": project }

@app.post("/normalize")
async def api_normalize(project: str = Form(...), rec: str = Form(...), bin: str = Form(...)):
    project_dir = get_project_dir(project)
    used = set()
    rec2, used = normalize_chains(Path(rec), used)
    bin2, used = normalize_chains(Path(bin), used)
    return { "rec": str(rec2), "bin": str(bin2), "project": project }

@app.post("/sanitize")
async def api_sanitize(project: str = Form(...), rec: str = Form(...), bin: str = Form(...)):
    project_dir = get_project_dir(project)
    rec2 = sanitize_pdb(Path(rec))
    bin2 = sanitize_pdb(Path(bin))
    return { "rec": str(rec2), "bin": str(bin2), "project": project }

@app.post("/merge")
async def api_merge(project: str = Form(...), rec: str = Form(...), bin: str = Form(...)):
    project_dir = get_project_dir(project)
    out = project_dir / "complex_input.pdb"
    combine_in_python(Path(rec), Path(bin), out)
    return { "out": str(out), "path": str(out), "output": str(out), "project": project }


# ---------------- DOCKING ----------------
@app.post("/dock")
async def api_dock(project: str = Form(...), nstruct: int = Form(10)):
    """
    Run Rosetta docking on the merged complex and return the best result.
    """
    project_dir = get_project_dir(project)
    complex_pdb = project_dir / "complex_input.pdb"
    
    if not complex_pdb.exists():
        raise FileNotFoundError(
            f"Complex PDB not found at {complex_pdb}. "
            "Please run the merge step first."
        )
    
    # Actually run Rosetta docking
    docking_result = run_docking(
        complex_pdb=complex_pdb,
        output_dir=project_dir,
        nstruct=nstruct,
    )
    
    # Parse results to find best model
    best = parse_fasc_and_find_best(
        fasc_path=Path(docking_result["fasc_path"]),
        pdb_glob=str(project_dir / "complex_input_full_*.pdb")
    )
    
    # Return with frontend-expected keys
    return {
        "score": best["score"],
        "bestScore": best["score"],
        "desc": best["desc"],
        "bestModel": best["desc"],
        "index": best["index"],
        "pdb_path": str(best["pdb_path"]),
        "bestPdbPath": str(best["pdb_path"]),
        "log_path": docking_result["log_path"],
        "project": project,
    }


# ---------------- DOCKING WITH STREAMING ----------------
ROSETTA_BIN = "/home/gowrishr74/Documents/rosetta.source.release-371/main/source/bin/rosetta_scripts.linuxgccrelease"

# Store active docking processes for cancellation
active_docking_jobs: dict[str, subprocess.Popen] = {}

@app.post("/dock-stream")
async def api_dock_stream(project: str = Form(...), nstruct: int = Form(10)):
    """
    Run Rosetta docking with real-time progress streaming via SSE.
    """
    project_dir = get_project_dir(project)
    complex_pdb = project_dir / "complex_input.pdb"
    
    if not complex_pdb.exists():
        raise HTTPException(status_code=400, detail="Complex PDB not found. Run merge first.")
    
    async def generate_progress():
        # Setup docking files
        xml_path = project_dir / "docking_full.xml"
        options_path = project_dir / "docking.options.txt"
        log_path = project_dir / "docking_full.log"
        
        # Copy the WORKING XML protocol (full docking pipeline)
        DOCKING_XML_SRC = Path("/home/gowrishr74/docking_new/docking_full.xml")
        DOCKING_OPTIONS_SRC = Path("/home/gowrishr74/docking_new/docking.options.txt")
        
        shutil.copy(DOCKING_XML_SRC, xml_path)
        
        # Copy and update options file with correct paths
        opt_text = DOCKING_OPTIONS_SRC.read_text().splitlines()
        new_lines = []
        for line in opt_text:
            if line.strip().startswith("-s "):
                new_lines.append(f"-s {complex_pdb}")
            elif line.strip().startswith("-out:file:scorefile"):
                new_lines.append(f"-out:file:scorefile {project_dir / 'docking.fasc'}")
            else:
                new_lines.append(line)
        # Add nstruct override
        new_lines.append(f"-nstruct {nstruct}")
        options_path.write_text("\n".join(new_lines))
        
        cmd = [
            ROSETTA_BIN,
            f"@{options_path}",
            "-parser:protocol", str(xml_path),
            "-out:suffix", "_full",
            "-overwrite"
        ]
        
        # Send start event
        yield f"data: {json.dumps({'type': 'start', 'total': nstruct, 'message': 'Starting Rosetta docking...'})}\n\n"
        
        # Send initial progress (0%)
        yield f"data: {json.dumps({'type': 'progress', 'current': 0, 'total': nstruct, 'percent': 0})}\n\n"
        
        # Start process
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=str(project_dir)
        )
        
        # Store for potential cancellation
        active_docking_jobs[project] = process
        
        structures_done = 0
        scores = []
        last_progress_sent = -1
        fasc_path = project_dir / "docking.fasc"
        
        def check_fasc_file():
            """Helper to check .fasc file and return count of completed structures"""
            if not fasc_path.exists():
                return 0
            try:
                fasc_content = fasc_path.read_text()
                score_lines = [
                    l for l in fasc_content.splitlines()
                    if l.startswith("SCORE:")
                    and "total_score" not in l
                    and "description" not in l
                    and len(l.split()) >= 2
                ]
                return len(score_lines)
            except Exception:
                return 0
        
        def should_send_progress(current_count: int) -> bool:
            """Check if progress should be sent"""
            nonlocal last_progress_sent
            if current_count != last_progress_sent and current_count >= 0:
                last_progress_sent = current_count
                return True
            return False
        
        try:
            # Stream output line by line
            with open(log_path, "w") as log_file:
                line_count = 0
                
                for line in iter(process.stdout.readline, ''):
                    if not line:
                        break
                    
                    line_count += 1
                    log_file.write(line)
                    log_file.flush()
                    
                    # Check fasc file VERY frequently (every 3 lines) for progress - MOST RELIABLE METHOD
                    if line_count % 3 == 0:
                        fasc_count = check_fasc_file()
                        if fasc_count > structures_done:
                            structures_done = fasc_count
                            if should_send_progress(structures_done):
                                percent = min(100, int((structures_done / nstruct) * 100))
                                yield f"data: {json.dumps({'type': 'progress', 'current': structures_done, 'total': nstruct, 'percent': percent})}\n\n"
                    
                    # Parse progress - Rosetta prints structure completion
                    # Look for "protocols.jd2.JobDistributor" lines
                    if "protocols.jd2.JobDistributor" in line or "JobDistributor" in line:
                        # Try multiple patterns
                        match = re.search(r"starting\s+(\d+)", line, re.IGNORECASE)
                        if not match:
                            match = re.search(r"(\d+)\s+of", line, re.IGNORECASE)
                        if not match:
                            match = re.search(r"job\s+(\d+)", line, re.IGNORECASE)
                        
                        if match:
                            current = int(match.group(1))
                            structures_done = max(structures_done, current)
                            if should_send_progress(structures_done):
                                percent = min(100, int((structures_done / nstruct) * 100))
                                yield f"data: {json.dumps({'type': 'progress', 'current': structures_done, 'total': nstruct, 'percent': percent})}\n\n"
                    
                    # Parse completion messages - multiple patterns (removed to avoid false positives)
                    
                    # Check for SCORE lines (real scores, not headers) - this indicates progress!
                    if line.startswith("SCORE:") and "total_score" not in line and "description" not in line:
                        parts = line.split()
                        if len(parts) >= 2:
                            try:
                                score = float(parts[1])
                                desc = parts[-1] if len(parts) > 2 else "unknown"
                                scores.append({"score": score, "desc": desc})
                                
                                # Each SCORE line means a structure completed - update progress immediately!
                                structures_done = len(scores)
                                if should_send_progress(structures_done):
                                    percent = min(100, int((structures_done / nstruct) * 100))
                                    yield f"data: {json.dumps({'type': 'progress', 'current': structures_done, 'total': nstruct, 'percent': percent})}\n\n"
                                
                                yield f"data: {json.dumps({'type': 'score', 'score': score, 'desc': desc, 'line': line.strip()})}\n\n"
                            except ValueError:
                                pass
                    
                    # Allow other async tasks
                    await asyncio.sleep(0)
            
            process.wait()
            
            # Remove from active jobs
            if project in active_docking_jobs:
                del active_docking_jobs[project]
            
            # Parse final results
            fasc_path = project_dir / "docking.fasc"
            if fasc_path.exists():
                try:
                    best = parse_fasc_and_find_best(
                        fasc_path=fasc_path,
                        pdb_glob=str(project_dir / "complex_input_full_*.pdb")
                    )
                    all_models = parse_fasc_all_models(
                        fasc_path=fasc_path,
                        pdb_glob=str(project_dir / "complex_input_full_*.pdb")
                    )
                    # Convert Path objects to strings for JSON
                    for model in all_models:
                        if model.get("pdb_path"):
                            model["pdb_path"] = str(model["pdb_path"])
                    yield f"data: {json.dumps({'type': 'complete', 'bestScore': best['score'], 'bestModel': best['desc'], 'pdbPath': str(best['pdb_path']), 'index': best['index'], 'allModels': all_models})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to parse results: {str(e)}'})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Docking failed - no results file generated'})}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            if project in active_docking_jobs:
                del active_docking_jobs[project]
    
    return StreamingResponse(
        generate_progress(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/dock-cancel")
async def api_dock_cancel(project: str = Form(...)):
    """Cancel a running docking job."""
    if project in active_docking_jobs:
        process = active_docking_jobs[project]
        process.terminate()
        del active_docking_jobs[project]
        return {"status": "cancelled", "project": project}
    return {"status": "not_found", "project": project}


# -------------- VISUALIZATION ------------
@app.post("/visualize")
async def api_visualize(project: str = Form(...), pdb: str = Form(None)):
    project_dir = get_project_dir(project)
    visualize_best_model(
        fasc_path=project_dir / "docking.fasc",
        pdb_glob=str(project_dir / "complex_input_full_*.pdb")
    )
    return { "ok": True, "project": project }


# --------------- DOWNLOAD ----------------
@app.get("/download")
async def api_download(path: str):
    return FileResponse(path)


@app.get("/dock-results")
async def api_dock_results(project: str):
    """
    Get all docking results for a project.
    """
    project_dir = get_project_dir(project)
    fasc_path = project_dir / "docking.fasc"
    
    if not fasc_path.exists():
        raise HTTPException(status_code=404, detail="Docking results not found. Run docking first.")
    
    try:
        all_models = parse_fasc_all_models(
            fasc_path=fasc_path,
            pdb_glob=str(project_dir / "complex_input_full_*.pdb")
        )
        # Convert Path objects to strings for JSON
        for model in all_models:
            if model.get("pdb_path"):
                model["pdb_path"] = str(model["pdb_path"])
        
        best = parse_fasc_and_find_best(
            fasc_path=fasc_path,
            pdb_glob=str(project_dir / "complex_input_full_*.pdb")
        )
        
        return {
            "allModels": all_models,
            "best": {
                "score": best["score"],
                "desc": best["desc"],
                "index": best["index"],
                "pdb_path": str(best["pdb_path"]),
            },
            "project": project,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse results: {str(e)}")
