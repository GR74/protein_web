"""Helper module for checking docking progress by reading .fasc file"""

from pathlib import Path


def count_completed_structures(fasc_path: Path) -> int:
    """
    Count how many structures have been completed by counting SCORE lines.
    Returns 0 if file doesn't exist or no scores found.
    """
    if not fasc_path.exists():
        return 0
    
    try:
        content = fasc_path.read_text()
        lines = content.splitlines()
        
        # Count SCORE lines that are actual data (not headers)
        count = 0
        for line in lines:
            if (line.startswith("SCORE:")
                and "total_score" not in line
                and "description" not in line
                and len(line.split()) >= 2):
                try:
                    # Try to parse the score to ensure it's valid
                    float(line.split()[1])
                    count += 1
                except (ValueError, IndexError):
                    continue
        
        return count
    except Exception:
        return 0

