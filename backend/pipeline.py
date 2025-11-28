#!/usr/bin/env python3
"""
pipeline.py

Pure backend API for the Rosetta docking pipeline.

This module exposes functions that your FastAPI backend can call:
- fetch_pdb
- copy_uploaded_pdb
- write_fasta
- run_colabfold
- run_clean_pdb
- normalize_chains
- sanitize_pdb
- combine_in_python
- parse_fasc_and_find_best
- visualize_best_model
- open_best_model_in_pymol
"""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
import re
import glob

import requests
import numpy as np
from Bio.PDB import PDBParser, PDBIO

# ============================================================
# CONFIG
# ============================================================

# Path to Rosetta clean_pdb.py
ROSETTA_CLEAN_PDB = (
    "/home/gowrishr74/Documents/rosetta.source.release-371/main/"
    "tools/protein_tools/scripts/clean_pdb.py"
)

# Path to Rosetta scripts executable (without .default)
ROSETTA_SCRIPTS = (
    "/home/gowrishr74/Documents/rosetta.source.release-371/main/"
    "source/bin/rosetta_scripts.linuxgccrelease"
)

# Source paths for working docking config
DOCKING_XML_SRC = Path("/home/gowrishr74/docking_new/docking_full.xml")
DOCKING_OPTIONS_SRC = Path("/home/gowrishr74/docking_new/docking.options.txt")

# Default working base (can be overridden by env or by passing explicit paths)
DEFAULT_WORKDIR = Path(os.environ.get("PROTEINWEB_WORKDIR", "/home/gowrishr74/app_test"))

# Surface gap for merging
SURFACE_GAP = 2.0  # Å separation

# Default locations for docking outputs (used by parse_fasc_and_find_best / visualize_best_model)
FASC_PATH = DEFAULT_WORKDIR / "docking.fasc"
PDB_GLOB = str(DEFAULT_WORKDIR / "complex_input_full_*.pdb")


# ============================================================
# BEST MODEL PARSER (FASC + PDB MATCHING)
# ============================================================

def extract_index(desc: str) -> int | None:
    """
    Extract numeric suffix like 0003 from 'complex_input_full_0003'.
    """
    m = re.search(r"_(\d+)$", desc)
    return int(m.group(1)) if m else None


def parse_fasc_all_models(
    fasc_path: Path | None = None, pdb_glob: str | None = None
) -> list[dict]:
    """
    Parse a Rosetta .fasc file and return ALL models with detailed scores.

    Returns a list of dicts, each containing all score components plus:
        {
          "score": float (total_score),
          "desc": str,
          "index": int,
          "pdb_path": str | None
        }
    """
    fasc_path = fasc_path or FASC_PATH
    pdb_glob = pdb_glob or PDB_GLOB

    if not fasc_path.exists():
        raise FileNotFoundError(f"Missing docking.fasc at {fasc_path}")

    lines = fasc_path.read_text().splitlines()
    
    # Parse header to get column order (line with "SCORE:" and "total_score")
    header_line = None
    header_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("SCORE:") and "total_score" in line:
            header_line = line
            header_idx = i
            break
    
    if not header_line:
        raise RuntimeError("Could not find SCORE header line in docking.fasc")
    
    # Parse header columns (skip "SCORE:" prefix)
    # Split on whitespace but preserve structure
    header_parts = header_line.split()
    # Find where "description" is in header
    desc_idx = -1
    for i, part in enumerate(header_parts):
        if part == "description":
            desc_idx = i
            break
    
    # Get all column names except "SCORE:" and "description"
    column_names = header_parts[1:desc_idx] if desc_idx > 0 else header_parts[1:]
    
    models: list[dict] = []
    
    # Find all PDB files upfront for matching
    candidates = sorted(glob.glob(pdb_glob))
    pdb_map: dict[int, Path] = {}
    for c in candidates:
        idx = extract_index(Path(c).stem)
        if idx is not None:
            pdb_map[idx] = Path(c)

    # Parse data lines (skip header and SEQUENCE lines)
    for line in lines[header_idx + 1:]:
        if not line.startswith("SCORE:") or "total_score" in line:
            continue  # Skip non-data lines

        parts = line.split()
        if len(parts) < 3:  # Need at least SCORE:, value, description
            continue

        # Build model dict from columns
        model: dict = {}
        
        # Parse all score columns (skip "SCORE:" at index 0)
        # The number of data values should match column_names
        # Description is always the last field
        num_data_values = len(parts) - 2  # -2 for "SCORE:" and description
        
        for i, col_name in enumerate(column_names):
            if i < num_data_values:
                try:
                    model[col_name] = float(parts[i + 1])  # +1 to skip "SCORE:"
                except (ValueError, IndexError):
                    model[col_name] = None
            else:
                model[col_name] = None
        
        # Description is last
        desc = parts[-1]
        model["desc"] = desc
        model["index"] = extract_index(desc)
        
        # Use total_score as "score" for compatibility
        model["score"] = model.get("total_score", 0.0)
        
        # Find matching PDB
        idx = model["index"]
        if idx is not None and idx in pdb_map:
            model["pdb_path"] = str(pdb_map[idx])
        else:
            model["pdb_path"] = None

        models.append(model)

    if not models:
        raise RuntimeError("No SCORE lines parsed in docking.fasc.")

    return models


def parse_fasc_and_find_best(
    fasc_path: Path | None = None, pdb_glob: str | None = None
) -> dict:
    """
    Parse a Rosetta .fasc file and return the best-scoring model.

    Returns a dict:
        {
          "score": float,
          "desc": str,
          "index": int,
          "pdb_path": Path
        }
    """
    all_models = parse_fasc_all_models(fasc_path, pdb_glob)
    
    # Find best (lowest score)
    best = min(all_models, key=lambda x: x["score"])
    
    # Ensure pdb_path is Path object for backward compatibility
    if best.get("pdb_path"):
        best["pdb_path"] = Path(best["pdb_path"])
    
    return best


# ============================================================
# VISUALIZATION WITH TIFF EXPORT
# ============================================================

def visualize_best_model(
    fasc_path: Path | None = None,
    pdb_glob: str | None = None,
) -> None:
    """
    Generate a PyMOL script + TIFF for the best docking model and launch PyMOL.
    """
    best = parse_fasc_and_find_best(fasc_path=fasc_path, pdb_glob=pdb_glob)
    best_pdb: Path = best["pdb_path"]

    pml_path = best_pdb.with_suffix(".pml")
    img_path = best_pdb.with_suffix(".tiff")

    pml_path.write_text(
        f"""
load {best_pdb}

hide everything

# Coloring
color teal, chain A
color orange, chain B
show cartoon, chain A or chain B
set cartoon_transparency, 0.3

# Interface highlighting
select interface_A, (chain A within 5 of chain B)
select interface_B, (chain B within 5 of chain A)
select interface, interface_A or interface_B

show sticks, interface
set stick_radius, 0.2
set stick_quality, 16
color hotpink, interface

# Optional mesh
show mesh, interface
set mesh_width, 0.4
set mesh_color, gray70
set mesh_quality, 2

zoom interface

# High-resolution TIFF render
ray 2000,1500
png {img_path}, dpi=300
"""
    )

    print("\n=====================================")
    print(" BEST DOCKING MODEL")
    print("=====================================")
    print(f"Descriptor:  {best['desc']}")
    print(f"Score:       {best['score']}")
    print(f"PDB File:    {best_pdb}")
    print(f"TIFF Image:  {img_path}")
    print("=====================================")
    print("Launching PyMOL…")

    subprocess.run(["pymol", str(pml_path)], check=False)


# ============================================================
# INPUT / STRUCTURE HELPERS
# ============================================================

def fetch_pdb(pdb_code: str, output_dir: Path) -> Path:
    """
    Download a PDB file from RCSB and save to output_dir.
    """
    pdb_code = pdb_code.lower().strip()
    url = f"https://files.rcsb.org/download/{pdb_code}.pdb"  # fixed spaces
    r = requests.get(url)
    r.raise_for_status()

    output_dir.mkdir(exist_ok=True, parents=True)
    out = output_dir / f"{pdb_code}.pdb"
    out.write_bytes(r.content)

    print(f"📥 Fetched {pdb_code} → {out}")
    return out


def write_fasta(sequence: str, output_dir: Path, name: str) -> Path:
    """
    Write a FASTA file for a given amino-acid sequence.
    """
    output_dir.mkdir(exist_ok=True, parents=True)
    fasta = output_dir / f"{name}.fasta"
    fasta.write_text(f">{name}\n{sequence.strip()}\n")
    return fasta


def run_colabfold(fasta_path: Path, output_dir: Path) -> Path:
    """
    Run ColabFold and return the first produced PDB path.
    Activates the 'colabfold' conda environment before running.
    Logs are saved to output_dir/colabfold.log
    """
    output_dir.mkdir(exist_ok=True, parents=True)
    
    # Path to conda
    CONDA_PATH = "/home/gowrishr74/anaconda3"
    CONDA_ENV = "colabfold"
    
    # Log file path
    log_path = output_dir / "colabfold.log"
    
    # Build command that activates conda env and runs colabfold
    # Using bash -c to properly source conda and activate environment
    activate_cmd = f"""
source {CONDA_PATH}/etc/profile.d/conda.sh
conda activate {CONDA_ENV}
colabfold_batch "{fasta_path}" "{output_dir}" --use-gpu-relax
"""
    
    print(f"🧬 Running ColabFold prediction...")
    print(f"   Input: {fasta_path}")
    print(f"   Output: {output_dir}")
    print(f"   Log: {log_path}")
    
    # Run with output to both console and log file
    with open(log_path, "w") as log_file:
        log_file.write(f"=== ColabFold Prediction ===\n")
        log_file.write(f"Input FASTA: {fasta_path}\n")
        log_file.write(f"Output Dir: {output_dir}\n")
        log_file.write(f"Conda Env: {CONDA_ENV}\n")
        log_file.write(f"=" * 40 + "\n\n")
        
        process = subprocess.Popen(
            ["bash", "-c", activate_cmd],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Stream output to both console and log file
        for line in iter(process.stdout.readline, ''):
            if not line:
                break
            print(line, end='')  # Print to console
            log_file.write(line)  # Write to log file
            log_file.flush()
        
        process.wait()
        
        if process.returncode != 0:
            error_msg = f"ColabFold failed with exit code {process.returncode}"
            log_file.write(f"\n\nERROR: {error_msg}\n")
            raise RuntimeError(error_msg)
        
        log_file.write(f"\n\n=== ColabFold Completed Successfully ===\n")

    pdbs = list(output_dir.glob("*.pdb"))
    if not pdbs:
        raise FileNotFoundError("ColabFold produced no PDB. Check if GPU is available and CUDA is configured.")
    
    # Return the best ranked model
    ranked_pdbs = sorted([p for p in pdbs if "rank" in p.name.lower()])
    if ranked_pdbs:
        print(f"✅ Best model: {ranked_pdbs[0]}")
        return ranked_pdbs[0]
    print(f"✅ Model: {pdbs[0]}")
    return pdbs[0]


def copy_uploaded_pdb(path: str, output_dir: Path) -> Path:
    """
    Copy a user-uploaded PDB into the working directory.
    """
    src = Path(path)
    if not src.exists():
        raise FileNotFoundError(src)
    output_dir.mkdir(exist_ok=True, parents=True)
    dest = output_dir / src.name
    shutil.copy(src, dest)
    print(f"📂 Copied → {dest}")
    return dest


# ============================================================
# ROSETTA CLEAN
# ============================================================

def detect_first_chain(pdb_path: Path) -> str:
    """
    Detect the first chain ID in a PDB file.
    """
    with open(pdb_path) as fh:
        for line in fh:
            if line.startswith(("ATOM", "HETATM")):
                return line[21].strip() or "A"
    return "A"


def run_clean_pdb(input_path: Path, output_path: Path) -> None:
    """
    Run Rosetta's clean_pdb.py on a PDB and move the result to output_path.
    """
    chain = detect_first_chain(input_path)
    print(f"🧼 Cleaning {input_path.name} (chain {chain})")

    # Run clean_pdb.py from the input file's directory so output lands there
    subprocess.run(
        ["python3", ROSETTA_CLEAN_PDB, str(input_path), chain],
        check=True,
        cwd=input_path.parent  # Run from input directory so output goes there
    )

    expected = input_path.stem + f"_{chain}.pdb"
    expected_path = input_path.parent / expected
    
    # Also check current working directory as fallback
    if not expected_path.exists():
        cwd_path = Path.cwd() / expected
        if cwd_path.exists():
            expected_path = cwd_path
        else:
            raise FileNotFoundError(
                f"Rosetta output missing: checked {expected_path} and {cwd_path}"
            )

    shutil.move(str(expected_path), output_path)
    print(f"✅ Cleaned → {output_path}")


# ============================================================
# CHAIN NORMALIZER
# ============================================================

def normalize_chains(pdb_path: Path, used: set | None = None) -> tuple[Path, set]:
    """
    Ensure unique chain IDs for all models.

    Returns:
        (fixed_pdb_path, updated_used_set)
    """
    if used is None:
        used = set()

    fixed = pdb_path.with_name(pdb_path.stem + "_chains.pdb")
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    new_lines: list[str] = []
    chain_map: dict[str, str] = {}
    next_idx = len(used)

    with open(pdb_path) as fh:
        for line in fh:
            if line.startswith(("ATOM", "HETATM")):
                old = line[21]
                if old.strip() == "":
                    old = "_"

                if old not in chain_map:
                    while letters[next_idx] in used:
                        next_idx += 1
                    new_chain = letters[next_idx]
                    chain_map[old] = new_chain
                    used.add(new_chain)
                    next_idx += 1

                new_lines.append(line[:21] + chain_map[old] + line[22:])
            else:
                new_lines.append(line)

    fixed.write_text("".join(new_lines))
    return fixed, used


# ============================================================
# RESIDUE SANITIZER
# ============================================================

def sanitize_pdb(pdb_path: Path) -> Path:
    """
    Renumber residues sequentially, ignoring insertion codes.
    """
    fixed = pdb_path.with_name(pdb_path.stem + "_fixed.pdb")
    new_lines: list[str] = []
    last_key = None
    new_resseq = 1
    new_num = "   1"

    with open(pdb_path) as fh:
        for line in fh:
            if line.startswith(("ATOM", "HETATM")):
                chain = line[21]
                resseq = line[22:26].strip()
                icode = line[26].strip()
                key = (chain, resseq, icode)

                if key != last_key:
                    new_num = f"{new_resseq:4d}"
                    new_resseq += 1
                    last_key = key

                new_lines.append(line[:22] + new_num + " " + line[27:])
            else:
                new_lines.append(line)

    fixed.write_text("".join(new_lines))
    return fixed


# ============================================================
# ALIGN + MERGE
# ============================================================

def load_coords(pdb_path: Path):
    parser = PDBParser(QUIET=True)
    struct = parser.get_structure("s", pdb_path)
    coords = np.array([a.coord for a in struct.get_atoms()])
    return coords, struct


def translate_structure(struct, vec):
    for atom in struct.get_atoms():
        atom.coord = atom.coord + vec


def save_pdb(struct, path: Path):
    io = PDBIO()
    io.set_structure(struct)
    io.save(str(path))


def combine_in_python(rec: Path, bin: Path, out: Path, gap: float = SURFACE_GAP) -> None:
    """
    Align binder to receptor such that the closest atoms are at a given gap distance,
    then write out a merged complex PDB.
    """
    parser = PDBParser(QUIET=True)

    rec_struct = parser.get_structure("rec", rec)
    bin_struct = parser.get_structure("bin", bin)

    # Force chain IDs
    for atom in rec_struct.get_atoms():
        atom.get_parent().get_parent().id = "A"
    for atom in bin_struct.get_atoms():
        atom.get_parent().get_parent().id = "B"

    # Coordinates BEFORE merge
    rec_coords = np.array([a.coord for a in rec_struct.get_atoms()])
    bin_coords = np.array([a.coord for a in bin_struct.get_atoms()])

    # Find closest pair
    dists = np.linalg.norm(rec_coords[:, None, :] - bin_coords[None, :, :], axis=2)
    min_i, min_j = np.unravel_index(np.argmin(dists), dists.shape)
    # min_dist = dists[min_i, min_j]  # unused but kept for clarity

    # Vector binder → receptor
    vec = rec_coords[min_i] - bin_coords[min_j]
    norm = np.linalg.norm(vec)
    if norm < 1e-6:
        vec = np.array([1.0, 0.0, 0.0])
        norm = 1.0

    unit = vec / norm

    # Required movement to reach final distance = gap
    needed = norm - gap

    # Test BOTH possible directions
    shift_forward = unit * (-needed)  # expected direction (toward)
    shift_backward = unit * needed    # opposite direction

    # Compute resulting closest distances
    test1 = np.min(
        np.linalg.norm((bin_coords + shift_forward)[:, None, :] - rec_coords[None, :, :], axis=2)
    )
    test2 = np.min(
        np.linalg.norm((bin_coords + shift_backward)[:, None, :] - rec_coords[None, :, :], axis=2)
    )

    # Choose the shift that gives distance closest to desired gap
    final_shift = shift_forward if abs(test1 - gap) < abs(test2 - gap) else shift_backward

    # Apply translation
    for atom in bin_struct.get_atoms():
        atom.coord += final_shift

    # Merge
    rec_model = rec_struct[0]
    for chain in bin_struct[0]:
        rec_model.add(chain)

    # Save
    io = PDBIO()
    io.set_structure(rec_struct)
    io.save(str(out))

    print(f"🤝 Complex saved → {out}")


# ============================================================
# ROSETTA DOCKING
# ============================================================

def run_docking(
    complex_pdb: Path,
    output_dir: Path | None = None,
    nstruct: int = 10,
    xml_content: str | None = None,
    options_extra: str = "",
) -> dict:
    """
    Run Rosetta docking protocol on a complex PDB.
    
    Args:
        complex_pdb: Path to the merged complex PDB file
        output_dir: Directory for output files (defaults to complex_pdb's directory)
        nstruct: Number of structures to generate
        xml_content: Custom XML protocol (uses default if None)
        options_extra: Additional command-line options
    
    Returns:
        dict with keys: fasc_path, output_dir, nstruct
    """
    if output_dir is None:
        output_dir = complex_pdb.parent
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy complex to output dir if not already there
    complex_dest = output_dir / "complex_input.pdb"
    if complex_pdb != complex_dest:
        shutil.copy(complex_pdb, complex_dest)
    
    # Copy working XML protocol
    xml_path = output_dir / "docking_full.xml"
    shutil.copy(DOCKING_XML_SRC, xml_path)
    print(f"→ Copied docking_full.xml → {xml_path}")
    
    # Copy and update options file
    options_path = output_dir / "docking.options.txt"
    shutil.copy(DOCKING_OPTIONS_SRC, options_path)
    
    # Update -s line in options to point to our complex
    opt_text = options_path.read_text().splitlines()
    new_lines = []
    for line in opt_text:
        if line.strip().startswith("-s "):
            new_lines.append(f"-s {complex_dest}")
        else:
            new_lines.append(line)
    options_path.write_text("\n".join(new_lines))
    print(f"→ Updated docking.options.txt with complex path")
    
    print(f"🚀 Starting Rosetta docking...")
    print(f"   Complex: {complex_dest}")
    print(f"   Output:  {output_dir}")
    print(f"   nstruct: {nstruct}")
    
    # Build command exactly like the working script
    docking_cmd = [
        ROSETTA_SCRIPTS,
        f"@{options_path}",
        "-parser:protocol", str(xml_path),
        "-out:suffix", "_full",
        "-nstruct", str(nstruct),
        "-overwrite"
    ]
    
    print(f"   Command: {' '.join(docking_cmd)}")
    print("=" * 50)
    
    # Run with log file
    log_path = output_dir / "docking_full.log"
    with open(log_path, "w") as log:
        result = subprocess.run(
            docking_cmd,
            cwd=output_dir,
            stdout=log,
            stderr=log
        )
    
    if result.returncode != 0:
        print(f"❌ Rosetta failed with code {result.returncode}")
        print(f"   See log: {log_path}")
        raise RuntimeError(f"Rosetta docking failed. Check {log_path}")
    
    print(f"✅ Docking complete!")
    print(f"   Results: {output_dir / 'docking.fasc'}")
    
    return {
        "fasc_path": str(output_dir / "docking.fasc"),
        "output_dir": str(output_dir),
        "nstruct": nstruct,
        "log_path": str(log_path),
    }


# ============================================================
# OPTIONAL: BEST MODEL FROM LOG (ALTERNATIVE PATH)
# ============================================================

def find_best_model_in_folder(folder: Path) -> Path:
    """
    Finds lowest-score model name from docking/docking_full.log,
    then resolves actual .pdb path (either working folder or cwd).
    """
    log_path = folder / "docking" / "docking_full.log"
    if not log_path.exists():
        raise FileNotFoundError("docking_full.log not found inside /docking/")

    best_score = float("inf")
    best_model: str | None = None

    with open(log_path) as f:
        for line in f:
            if line.startswith("SCORE:"):
                parts = line.split()
                try:
                    score = float(parts[1])
                    model = parts[-1]  # example: complex_input_full_0003
                    if score < best_score:
                        best_score = score
                        best_model = model
                except Exception:
                    continue

    if not best_model:
        raise RuntimeError("No valid SCORE lines found.")

    candidate = folder / f"{best_model}.pdb"
    if candidate.exists():
        return candidate

    # fallback: Rosetta often dumps results in script's run directory
    alt = Path(f"{best_model}.pdb")
    if alt.exists():
        return alt

    raise FileNotFoundError(
        f"Best model '{best_model}.pdb' not found in working folder nor current directory."
    )


def open_best_model_in_pymol(folder: Path) -> None:
    """
    Build a PyMOL visualization script for the best model found
    via docking_full.log and launch PyMOL.
    """
    best_pdb = find_best_model_in_folder(folder)
    pml_path = best_pdb.with_suffix(".pml")

    pml_path.write_text(
        f"""
# Load structure
load {best_pdb}

# Hide everything first
hide everything

# Color and show protein backbones as ribbons
color teal, chain A
color orange, chain B
show cartoon, chain A or chain B

# Ribbon transparency
set cartoon_transparency, 0.3

# Interface selections (within 5 Å)
select interface_A, (chain A within 5 of chain B)
select interface_B, (chain B within 5 of chain A)
select interface, interface_A or interface_B

# Show sticks for interface residues
show sticks, interface
set stick_radius, 0.2
set stick_quality, 16
color hotpink, interface

# Optional: show a mesh around the interface
show mesh, interface
set mesh_width, 0.4
set mesh_color, gray70
set mesh_quality, 2

# Nicely center the view
zoom interface
zoom animate=-1
"""
    )

    print(f"🎨 Opening best-scoring model in PyMOL → {best_pdb}")
    subprocess.run(["pymol", str(pml_path)], check=False)
