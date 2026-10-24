"""Build data/elk-hunt-areas.json from Wyoming Game and Fish's published elk
draw reports and hunt-area boundaries.

    python3 -I scripts/elk/build_elk_data.py <workdir>

<workdir> is scratch space for the downloaded PDFs; keep it outside the repo.
Needs `pdftotext` (poppler) on PATH. Re-run each year after WGFD posts the new
draw reports (late spring for nonresidents, June for residents) and update
YEAR and REPORTS below.
"""

import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

YEAR = 2026
ODDS_PAGE = "https://wgfd.wyo.gov/licenses-applications/draw-results-odds"
REPORTS = {
    # key: WGFD media id. Titles on the odds page: 2026_DrawingOdds_Elk_* and 2026_DemandReport_Elk_*.
    "nr_pp": 33777,
    "nr_random": 33779,
    "nr_special_pp": 33776,
    "nr_special_random": 33778,
    "nr_cc": 33772,
    "res": 33894,
    "res_cc": 33892,
}
AREAS_URL = (
    "https://services6.arcgis.com/cWzdqIyxbijuhPLw/arcgis/rest/services/ElkHuntAreas/FeatureServer/0/query"
    "?where=1%3D1&outFields=HUNTAREA,HERDUNIT,HERDNAME,SqMiles,HUNTNAME,Region"
    "&outSR=4326&geometryPrecision=4&maxAllowableOffset=0.003&f=geojson"
)

ROOT = Path(__file__).resolve().parents[2]
OUT_JSON = ROOT / "data" / "elk-hunt-areas.json"
OUT_GEOJSON = ROOT / "public" / "data" / "elk-hunt-areas.geojson"

UA = {"User-Agent": "wyomingmap.com data build"}

# Preference-point rows: [quota remaining] [issued]? [points] [applicants] [odds]%
PP_ROW = re.compile(r"(\d+)\s+(?:(\d+)\s+)?(<=?\s*\d+|\d+)\s+(\d+)\s+([\d.]+)%\s*$")
# Random and resident rows: [quota] [1st choice] [2nd choice] [3rd choice]
DEMAND_ROW = re.compile(r"^(\d{3}|[A-Z]{1,3})\s+(\d+)?\s*(.*?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$")
BLOCK_START = re.compile(r"^(\d{3}|[A-Z])\s+(\d+)?\s*(.*?)\s*$")


def fetch(url: str, dest: Path) -> Path:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())
    return dest


def pdf_text(pdf: Path) -> str:
    return subprocess.run(
        ["pdftotext", "-layout", str(pdf), "-"], check=True, capture_output=True, text=True
    ).stdout


def clean_desc(s: str) -> str:
    # WGFD truncates descriptions to 20 characters and leaves stray semicolons.
    s = s.strip().rstrip(";").strip()
    s = s.replace("ANTELERED", "ANTLERED")
    return s.capitalize()


def area_key(code: str) -> str:
    return str(int(code)) if code.isdigit() else code


def parse_pp(text: str) -> dict:
    """Preference-point reports continue a hunt's rows across page breaks, so
    the current block carries over until the next line that names an area."""
    hunts: dict = {}
    current = None
    for line in text.splitlines():
        m = PP_ROW.search(line)
        if not m:
            continue
        prefix = line[: m.start()].strip()
        quota, issued, points, applicants, odds = m.groups()
        if prefix:
            b = BLOCK_START.match(prefix)
            if not b:
                continue
            area, htype, desc = b.groups()
            if area.isalpha():
                # Region general licenses: "W  REGION W GENERAL"
                htype, desc = "GEN", desc
            current = {"area": area_key(area), "type": htype, "desc": clean_desc(desc), "quota": int(quota), "rows": []}
            hunts[(current["area"], current["type"])] = current
        if current is None:
            continue
        current["rows"].append(
            {
                "points": re.sub(r"\s+", " ", points),
                "issued": int(issued) if issued else 0,
                "applicants": int(applicants),
                "odds": float(odds),
            }
        )
    return hunts


def parse_demand(text: str) -> dict:
    hunts = {}
    for line in text.splitlines():
        m = DEMAND_ROW.match(line.strip())
        if not m:
            continue
        area, htype, desc, quota, first, second, third = m.groups()
        if area.isalpha() or not htype:
            continue  # "GEN  GENERAL" resident line; general licenses are sold, not drawn by area
        hunts[(area_key(area), htype)] = {
            "desc": clean_desc(desc),
            "quota": int(quota),
            "first": int(first),
            "second": int(second),
            "third": int(third),
        }
    return hunts


def pp_summary(rows: list) -> dict:
    """The point level where the draw ran out, as WGFD reports it."""
    drawn = [r for r in rows if r["applicants"] > 0]
    partial = next((r for r in drawn if 0 < r["odds"] < 100), None)
    guaranteed = [r for r in drawn if r["odds"] >= 100]
    lowest_sure = guaranteed[-1]["points"] if guaranteed else None
    shut_out = next((r for r in drawn if r["odds"] == 0), None)
    return {
        "partial": {"points": partial["points"], "odds": partial["odds"]} if partial else None,
        "lowestSure": lowest_sure,
        "allDrew": shut_out is None and partial is None,
        "applicants": sum(r["applicants"] for r in drawn),
    }


def bbox(geom: dict) -> list:
    xs, ys = [], []

    def walk(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0])
            ys.append(c[1])
        else:
            for x in c:
                walk(x)

    walk(geom["coordinates"])
    return [[round(min(xs), 4), round(min(ys), 4)], [round(max(xs), 4), round(max(ys), 4)]]


def main(workdir: Path) -> None:
    workdir.mkdir(parents=True, exist_ok=True)
    texts = {}
    for key, media in REPORTS.items():
        pdf = fetch(f"https://wgfd.wyo.gov/media/{media}/download?inline", workdir / f"elk_{key}.pdf")
        texts[key] = pdf_text(pdf)
    areas_geo = json.loads(fetch(AREAS_URL, workdir / "elk_areas.geojson").read_text())

    pp = {k: parse_pp(texts[k]) for k in ("nr_pp", "nr_special_pp")}
    demand = {k: parse_demand(texts[k]) for k in ("nr_random", "nr_special_random", "nr_cc", "res", "res_cc")}

    hunts_by_area: dict = {}
    keys = set()
    for table in list(pp.values()) + list(demand.values()):
        keys.update(table.keys())
    for area, htype in sorted(keys, key=lambda k: (k[0].zfill(3), k[1].zfill(3))):
        if not area.isdigit():
            continue
        k = (area, htype)
        desc = next((t[k]["desc"] for t in list(pp.values()) + list(demand.values()) if k in t), "")
        cow_calf = k in demand["nr_cc"] or k in demand["res_cc"]
        hunt = {"type": htype, "description": desc, "cowCalf": cow_calf}
        if k in pp["nr_pp"]:
            hunt["nrPoints"] = {"quota": pp["nr_pp"][k]["quota"], "rows": pp["nr_pp"][k]["rows"], "summary": pp_summary(pp["nr_pp"][k]["rows"])}
        if k in pp["nr_special_pp"]:
            hunt["nrSpecialPoints"] = {"quota": pp["nr_special_pp"][k]["quota"], "rows": pp["nr_special_pp"][k]["rows"], "summary": pp_summary(pp["nr_special_pp"][k]["rows"])}
        for name, table in (("nrRandom", "nr_random"), ("nrSpecialRandom", "nr_special_random"), ("nrCowCalf", "nr_cc"), ("resident", "res"), ("residentCowCalf", "res_cc")):
            if k in demand[table]:
                d = dict(demand[table][k])
                d.pop("desc")
                hunt[name] = d
        hunts_by_area.setdefault(area, []).append(hunt)

    areas = []
    for f in sorted(areas_geo["features"], key=lambda f: f["properties"]["HUNTAREA"]):
        p = f["properties"]
        num = str(int(p["HUNTAREA"]))
        areas.append(
            {
                "area": int(num),
                "name": p["HUNTNAME"].strip(),
                "herdUnit": int(p["HERDUNIT"]),
                "herdName": p["HERDNAME"].strip(),
                "region": p["Region"].strip(),
                "sqMiles": round(p["SqMiles"]),
                "bbox": bbox(f["geometry"]),
                "geometry": f["geometry"],
                "hunts": hunts_by_area.get(num, []),
            }
        )

    unmatched = sorted(set(hunts_by_area) - {str(a["area"]) for a in areas}, key=int)
    if unmatched:
        print("warning: draw data for areas with no boundary:", unmatched, file=sys.stderr)

    regions = {k[0]: v for k, v in pp["nr_pp"].items() if not k[0].isdigit()}
    out = {
        "year": YEAR,
        "sources": {
            "odds": ODDS_PAGE,
            "boundaries": AREAS_URL.split("/query")[0],
        },
        "nrRegions": {
            r: {"quota": v["quota"], "rows": v["rows"], "summary": pp_summary(v["rows"])} for r, v in sorted(regions.items())
        },
        "areas": areas,
    }
    OUT_JSON.write_text(json.dumps(out, separators=(",", ":")) + "\n")

    OUT_GEOJSON.parent.mkdir(parents=True, exist_ok=True)
    slim = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"area": a["area"], "name": a["name"]}, "geometry": a["geometry"]}
            for a in areas
        ],
    }
    OUT_GEOJSON.write_text(json.dumps(slim, separators=(",", ":")) + "\n")
    drawn = sum(1 for a in areas if a["hunts"])
    print(f"{len(areas)} areas, {drawn} with draw data, {sum(len(a['hunts']) for a in areas)} hunts -> {OUT_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
