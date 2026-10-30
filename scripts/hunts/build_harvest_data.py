"""Build data/<species>-harvest.json from Wyoming Game and Fish's annual
harvest reports: hunter success and days per animal for every hunt area and
license type, from the voluntary harvest survey.

    python3 -I scripts/hunts/build_harvest_data.py <species> <workdir>

<species> is elk or deer. <workdir> is scratch space for the downloaded PDF;
keep it outside the repo. Needs `pdftotext` (poppler) on PATH. Re-run each
year after WGFD posts the new reports (February) and update SEASON and the
media ids below. The season is the one hunted, a year before the draw the
hunt pages show.
"""

import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

SEASON = 2025
REPORTS_PAGE = "https://wgfd.wyo.gov/hunting-trapping/harvest-reports-surveys"

# Per species: the report's media id, and for each by-hunt-area and
# by-nonresident-region table its key, title and how many harvest columns it
# has (elk: bull, spike, cow, calf, total; deer: buck, doe, fawn, total).
# Deer reports keep mule deer and white-tailed deer apart.
SPECIES = {
    "elk": {
        "media": 33482,
        "tables": [("elk", "Harvest Statistics by Hunt Area", 5)],
        "regions": [("elk", "Harvest Statistics by Nonresident General Region", 5)],
    },
    "deer": {
        "media": 33467,
        "tables": [
            ("mule", "Mule Deer Harvest Statistics by Hunt Area", 4),
            ("whitetail", "White-Tailed Deer Harvest Statistics by Hunt Area", 4),
        ],
        "regions": [
            ("mule", "Mule Deer Harvest Statistics by Nonresident General Region", 4),
            ("whitetail", "White-Tailed Deer Harvest Statistics by Nonresident General Region", 4),
        ],
    },
}

ROOT = Path(__file__).resolve().parents[2]
UA = {"User-Agent": "wyomingmap.com data build"}

AREA_HEAD = re.compile(r"^(\d+)\s+([A-Z][^\d]*?)\s*$")
# A table row: an optional "(cross area)", the license type or summary label,
# then the numbers. Days per harvest is "Inf" where nobody took an animal.
NUMS = r"((?:[\d,.]+|-|Inf)(?:\s+(?:[\d,.]+|-|Inf))*)\s*$"
ROW = re.compile(r"^\s*(?:\([\d,\s]+\)\s+)?(GEN|Other|Total|Resident|Nonresident|\d+)\s+" + NUMS)
REGION_ROW = re.compile(r"^\s*NR\s+(?:Region\s+)?(\w+)\s+" + NUMS)
SUMMARY = {"Total": "total", "Resident": "resident", "Nonresident": "nonresident"}


def fetch(url: str, dest: Path) -> Path:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())
    return dest


def pdf_text(pdf: Path) -> str:
    return subprocess.run(
        ["pdftotext", "-layout", str(pdf), "-"], check=True, capture_output=True, text=True
    ).stdout


def number(s: str):
    return None if s in ("-", "Inf") else float(s.replace(",", ""))


def stats(nums: list, k: int) -> dict:
    # active, k harvest columns (the last is the total), hunter days, success %, days/harvest[, sold]
    active, harvest, days, success, per = nums[0], nums[k], nums[k + 1], nums[k + 2], nums[k + 3]
    return {
        "hunters": int(active),
        "harvest": int(harvest),
        "days": int(days),
        "success": success,
        "daysPerHarvest": per,
    }


def table_lines(text: str, title: str) -> list:
    """The lines of one table, across its continuation pages."""
    lines = text.splitlines()
    start = next(i for i, x in enumerate(lines) if re.search(rf"Table \d+: {re.escape(title)}", x))
    number_ = re.search(r"Table (\d+):", lines[start]).group(1)
    out = []
    for x in lines[start + 1 :]:
        m = re.search(r"Table (\d+)", x)
        if m and m.group(1) != number_ and re.match(r"^\s*Table \d+", x):
            break
        out.append(x)
    return out


def parse_areas(lines: list, k: int) -> dict:
    areas: dict = {}
    cur = None
    for x in lines:
        if not x.strip() or x.strip().isdigit() or x.startswith("Table") or "Harvest Statistics" in x:
            continue
        head = AREA_HEAD.match(x)
        if head and not ROW.match(x):
            cur = areas.setdefault(head.group(1), {"name": head.group(2), "types": {}})
            continue
        row = ROW.match(x)
        if not row or cur is None:
            continue
        nums = [number(t) for t in row.group(2).split()]
        if len(nums) < k + 4 or any(n is None for n in nums[: k + 2]):
            continue
        label = row.group(1)
        s = stats(nums, k)
        if label in SUMMARY:
            cur[SUMMARY[label]] = s
        else:
            # A cross-area row and the area's own row can share a type; keep the larger.
            prev = cur["types"].get(label)
            if not prev or s["hunters"] > prev["hunters"]:
                cur["types"][label] = s
    return areas


def parse_regions(text: str, title: str, k: int) -> dict:
    out = {}
    for x in table_lines(text, title):
        m = REGION_ROW.match(x)
        if m:
            nums = [number(t) for t in m.group(2).split()]
            out[m.group(1)] = stats(nums, k)
    return out


def main(species: str, workdir: Path) -> None:
    cfg = SPECIES[species]
    workdir.mkdir(parents=True, exist_ok=True)
    pdf = workdir / f"{species}-harvest-{SEASON}.pdf"
    if not pdf.exists():
        fetch(f"https://wgfd.wyo.gov/media/{cfg['media']}/download", pdf)
    text = pdf_text(pdf)
    if f"{SEASON} HARVEST REPORT" not in text:
        sys.exit(f"{pdf} is not the {SEASON} harvest report")

    out = {"season": SEASON, "source": f"https://wgfd.wyo.gov/media/{cfg['media']}/download", "reports": REPORTS_PAGE}
    for key, title, k in cfg["tables"]:
        areas = parse_areas(table_lines(text, title), k)
        missing = [a for a, v in areas.items() if "total" not in v]
        if missing:
            sys.exit(f"{key}: no Total row for areas {missing}")
        out.setdefault(key, {})["areas"] = areas
        print(f"{key}: {len(areas)} areas, {sum(len(v['types']) for v in areas.values())} license types")
    for key, title, k in cfg["regions"]:
        out[key]["regions"] = parse_regions(text, title, k)
        print(f"{key} regions: {' '.join(sorted(out[key]['regions']))}")

    dest = ROOT / "data" / f"{species}-harvest.json"
    dest.write_text(json.dumps(out, separators=(",", ":")) + "\n")
    print(f"wrote {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in SPECIES:
        sys.exit(__doc__)
    main(sys.argv[1], Path(sys.argv[2]))
