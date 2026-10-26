"""Build data/<species>-hunt-areas.json from Wyoming Game and Fish's published
draw reports, season regulations and hunt-area boundaries.

    python3 -I scripts/hunts/build_hunt_data.py <species> <workdir>

<species> is elk or deer. <workdir> is scratch space for the downloaded PDFs;
keep it outside the repo. Needs `pdftotext` (poppler) on PATH. Re-run each
year after WGFD posts the new draw reports (late spring for nonresidents, June
for residents) and update YEAR and SPECIES below.
"""

import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

YEAR = 2026
ODDS_PAGE = "https://wgfd.wyo.gov/licenses-applications/draw-results-odds"
REGULATIONS_PAGE = "https://wgfd.wyo.gov/regulations"
ARCGIS = "https://services6.arcgis.com/cWzdqIyxbijuhPLw/arcgis/rest/services"

# Per species: WGFD media ids for each report (titles on the odds page are
# 2026_DrawingOdds_<Species>_* and 2026_DemandReport_<Species>_*), what each
# report becomes on a hunt, and the boundary layer.
SPECIES = {
    "elk": {
        "reports": [
            # (key, media id, kind, field on the hunt)
            ("nr_pp", 33777, "pp", "nrPoints"),
            ("nr_random", 33779, "demand", "nrRandom"),
            ("nr_special_pp", 33776, "pp", "nrSpecialPoints"),
            ("nr_special_random", 33778, "demand", "nrSpecialRandom"),
            ("nr_cc", 33772, "demand", "nrCowCalf"),
            ("res", 33894, "demand", "resident"),
            ("res_cc", 33892, "demand", "residentCowCalf"),
        ],
        # Hunts that appear in these reports get flag=True.
        "antlerless": ("cowCalf", ("nr_cc", "res_cc")),
        "seasons": None,
        "layer": "ElkHuntAreas",
        "fields": "HUNTAREA,HERDUNIT,HERDNAME,SqMiles,HUNTNAME,Region",
        "props": lambda p: {
            "herdUnit": int(p["HERDUNIT"]),
            "herdName": p["HERDNAME"].strip(),
            "region": p["Region"].strip(),
        },
    },
    "deer": {
        "reports": [
            ("nr_pp", 33882, "pp", "nrPoints"),
            ("nr_random", 33883, "demand", "nrRandom"),
            ("nr_special_pp", 33884, "pp", "nrSpecialPoints"),
            ("nr_special_random", 33885, "demand", "nrSpecialRandom"),
            ("nr_df", 33877, "demand", "nrDoeFawn"),
            ("res", 33886, "demand", "resident"),
            ("res_df", 33879, "demand", "residentDoeFawn"),
        ],
        "antlerless": ("doeFawn", ("nr_df", "res_df")),
        # Chapter 6, Deer Hunting Seasons: dates, quotas, full license
        # descriptions and the legal boundary of every area.
        "seasons": 33694,
        "layer": "2026_Deer_Hunt_Areas",
        "fields": "HUNTAREA,HUNTNAME,MD_HERDUNI,MD_HERDNAM,WD_HERDUNI,WD_HERDNAM,SqMiles,Region",
        "props": lambda p: {
            "muleDeerHerd": {"unit": int(p["MD_HERDUNI"]), "name": p["MD_HERDNAM"].strip()} if p["MD_HERDUNI"] else None,
            "whitetailHerd": {"unit": int(p["WD_HERDUNI"]), "name": p["WD_HERDNAM"].strip()} if p["WD_HERDUNI"] else None,
            # The nonresident general-license region the area belongs to.
            "region": p["Region"].strip(),
        },
    },
}

ROOT = Path(__file__).resolve().parents[2]
UA = {"User-Agent": "wyomingmap.com data build"}

# Preference-point rows: [quota remaining] [issued]? [points] [applicants] [odds]%
PP_ROW = re.compile(r"(\d+)\s+(?:(\d+)\s+)?(<=?\s*\d+|\d+)\s+(\d+)\s+([\d.]+)%\s*$")
# Random and resident rows: [quota] [1st choice] [2nd choice] [3rd choice]
DEMAND_ROW = re.compile(r"^(\d{3}|[A-Z]{1,3})\s+(\d+)?\s*(.*?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$")
BLOCK_START = re.compile(r"^(\d{3}|[A-Z])\s+(\d+)?\s*(.*?)\s*$")

# Season table rows: area(s), type, two or four dates, quota?, limitations.
MONTH = r"(?:Jan|Feb|Mar|Apr|May|June|Jun|July|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\.?\s*\d{1,2}"
SEASON_ROW = re.compile(
    rf"^\s*(\d+(?:\s*,\s*\d+)*,?)\s+(Gen|\d+)\s+((?:{MONTH}\s+)*{MONTH})\s+(?:(\d+|Unlimited)\s+)?(\S.*?)\s*$"
)
AREA_CONT = re.compile(r"^\s*(\d+(?:\s*,\s*\d+)*,?)(?=\s|$)")
CLOSED_ROW = re.compile(r"^\s*(\d+)\s+Closed\s*$")
BOUNDARY_START = re.compile(r"^\s+Area (\d+)\.\s+(.*?)\.\s+(.*)$")


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
        if area.isalpha():
            if len(area) != 1:
                continue  # "GEN  GENERAL" resident line; resident general licenses are sold, not drawn
            htype = "GEN"  # nonresident region general license: "A  REGION A GENERAL"
        elif not htype:
            continue
        hunts[(area_key(area), htype)] = {
            "desc": clean_desc(desc),
            "quota": int(quota),
            "first": int(first),
            "second": int(second),
            "third": int(third),
        }
    return hunts


def season_date(s: str) -> str:
    """"Nov.1" and "Nov. 1" both become "Nov. 1"; May, June and July have no period."""
    month, day = re.match(r"([A-Za-z]+)\.?\s*(\d+)", s).groups()
    return f"{month}{'' if month in ('May', 'June', 'July') else '.'} {day}"


def parse_seasons(text: str) -> tuple:
    """The Section 2 table of a WGFD season regulation, keyed by (area, type),
    plus the areas it lists as closed. Rows wrap: the limitations column
    continues on following lines, and a list of areas ("23,") continues at the
    left margin while it ends in a comma."""
    seasons: dict = {}
    closed: list = []
    current = None

    def finish():
        if current:
            row = {k: current[k] for k in ("archery", "opens", "closes", "quota")}
            row["limitations"] = " ".join(current["lim"])
            for area in current["areas"]:
                seasons.setdefault((area, current["type"]), []).append(row)

    for line in text.split("Section 3.")[0].splitlines():
        if not line.strip():
            continue
        c = CLOSED_ROW.match(line)
        if c:
            finish()
            current = None
            closed.append(c.group(1))
            continue
        m = SEASON_ROW.match(line)
        if m:
            finish()
            areas, htype, dates, quota, lim = m.groups()
            d = re.findall(MONTH, dates)
            if len(d) not in (2, 4):
                print(f"warning: unexpected dates in season row: {line.strip()}", file=sys.stderr)
            d = [season_date(x) for x in d]
            current = {
                "areas": [a for a in re.split(r"\s*,\s*", areas.strip(", ")) if a],
                "type": "GEN" if htype == "Gen" else htype,
                "archery": d[:2] if len(d) == 4 else None,
                "opens": d[-2],
                "closes": d[-1],
                "quota": int(quota) if quota and quota.isdigit() else quota,
                "lim": [lim],
                "more": areas.rstrip().endswith(","),
                "col": m.start(5),
            }
            continue
        if current is None:
            continue
        rest = line
        a = AREA_CONT.match(line)
        if a and a.start(1) < 8 and current["more"]:
            current["areas"] += [x for x in re.split(r"\s*,\s*", a.group(1).strip(", ")) if x]
            current["more"] = a.group(1).endswith(",")
            rest = " " * a.end() + line[a.end() :]
        text_start = len(rest) - len(rest.lstrip())
        if not rest.strip():
            continue
        if text_start >= current["col"] - 4:
            current["lim"].append(rest.strip())
        else:
            # Page header, page number, or the end of the table.
            finish()
            current = None
    finish()
    for rows in seasons.values():
        for r in rows:
            r["limitations"] = re.sub(r"-\s(?=[a-z])", "-", r["limitations"]).rstrip(";")
    return seasons, closed


def parse_boundaries(text: str) -> dict:
    """Section 3: "Area 148. Teton. Beginning where ..." paragraphs."""
    out: dict = {}
    current = None
    body = text.split("Section 3.", 1)[1] if "Section 3." in text else ""
    for line in body.splitlines():
        s = line.strip()
        if not s or re.fullmatch(r"\d+-\d+", s):
            continue  # blank lines and page numbers
        m = BOUNDARY_START.match(line)
        if m:
            current = m.group(1)
            out[current] = [m.group(3)]
        elif re.match(r"^\s*Section \d+\.", line):
            current = None
        elif current:
            out[current].append(s)
    # A line that ends in a hyphen is a compound split across lines ("Wyoming-
    # Montana", "26-287"), not a broken word.
    return {k: "".join(x if x.endswith("-") else x + " " for x in v).strip() for k, v in out.items()}


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


def draw(kind: str, entry: dict) -> dict:
    if kind == "pp":
        return {"quota": entry["quota"], "rows": entry["rows"], "summary": pp_summary(entry["rows"])}
    d = dict(entry)
    d.pop("desc")
    return d


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


def describe(report_desc: str, seasons: list) -> str:
    """WGFD's draw reports cut descriptions at 20 characters; the season
    regulation has them in full. Use the first season whose limitations start
    with the report's text. When none does, the two documents disagree (Deer
    130 Type 1: "Antlered mule deer f" in the report, "Antlered mule deer or
    any white-tailed deer" in the regulation); the regulation is the legal
    text, so it wins."""
    head = report_desc.lower()
    for s in seasons:
        if s["limitations"].lower().startswith(head):
            return s["limitations"]
    return seasons[0]["limitations"] if seasons else report_desc


def main(species: str, workdir: Path) -> None:
    cfg = SPECIES[species]
    workdir.mkdir(parents=True, exist_ok=True)
    tables, kinds = {}, {}
    for key, media, kind, field in cfg["reports"]:
        pdf = fetch(f"https://wgfd.wyo.gov/media/{media}/download?inline", workdir / f"{species}_{key}.pdf")
        text = pdf_text(pdf)
        tables[field] = parse_pp(text) if kind == "pp" else parse_demand(text)
        kinds[field] = kind
    flag, flag_keys = cfg["antlerless"]
    flag_fields = {f for k, _, _, f in cfg["reports"] if k in flag_keys}

    seasons, closed, boundaries = {}, [], {}
    if cfg["seasons"]:
        text = pdf_text(fetch(f"https://wgfd.wyo.gov/media/{cfg['seasons']}/download?inline", workdir / f"{species}_seasons.pdf"))
        seasons, closed = parse_seasons(text)
        boundaries = parse_boundaries(text)

    layer_url = (
        f"{ARCGIS}/{cfg['layer']}/FeatureServer/0/query?where=1%3D1&outFields={cfg['fields']}"
        "&outSR=4326&geometryPrecision=4&maxAllowableOffset=0.003&f=geojson"
    )
    areas_geo = json.loads(fetch(layer_url, workdir / f"{species}_areas.geojson").read_text())

    hunts_by_area: dict = {}
    keys = set()
    for table in tables.values():
        keys.update(table.keys())
    for area, htype in sorted(keys, key=lambda k: (k[0].zfill(3), k[1].zfill(3))):
        if not area.isdigit():
            continue
        k = (area, htype)
        desc = next((t[k]["desc"] for t in tables.values() if k in t), "")
        hunt = {"type": htype, "description": describe(desc, seasons.get(k, [])), flag: any(k in tables[f] for f in flag_fields)}
        for field, table in tables.items():
            if k in table:
                hunt[field] = draw(kinds[field], table[k])
        if cfg["seasons"]:
            hunt["seasons"] = seasons.get(k, [])
            if not hunt["seasons"]:
                print(f"warning: no season rows for area {area} type {htype}", file=sys.stderr)
        hunts_by_area.setdefault(area, []).append(hunt)

    areas = []
    for f in sorted(areas_geo["features"], key=lambda f: f["properties"]["HUNTAREA"]):
        p = f["properties"]
        num = str(int(p["HUNTAREA"]))
        a = {"area": int(num), "name": p["HUNTNAME"].strip(), **cfg["props"](p)}
        a.update({"sqMiles": round(p["SqMiles"]), "bbox": bbox(f["geometry"]), "geometry": f["geometry"]})
        a["hunts"] = hunts_by_area.get(num, [])
        if cfg["seasons"]:
            a["general"] = seasons.get((num, "GEN"), [])
            a["closed"] = num in closed
            a["boundary"] = boundaries.get(num)
        areas.append(a)

    known = {str(a["area"]) for a in areas}
    unmatched = sorted(set(hunts_by_area) - known, key=int)
    if unmatched:
        print("warning: draw data for areas with no boundary:", unmatched, file=sys.stderr)
    if cfg["seasons"]:
        missing = sorted(known - set(boundaries), key=int)
        if missing:
            print("warning: no boundary description for areas:", missing, file=sys.stderr)

    # The pages combine each preference-point draw with its random draw on the
    # assumption that the random draw's first-choice pool is exactly the point
    # draw's unsuccessful applicants. True for every 2026 draw; say so if not.
    for k in keys:
        for pp, rnd in (("nrPoints", "nrRandom"), ("nrSpecialPoints", "nrSpecialRandom")):
            if k in tables.get(pp, {}) and k in tables.get(rnd, {}):
                rows = tables[pp][k]["rows"]
                losers = sum(r["applicants"] for r in rows) - sum(r["issued"] for r in rows)
                if losers != tables[rnd][k]["first"]:
                    print(f"warning: {k} {rnd} first-choice pool {tables[rnd][k]['first']} != point-draw losers {losers}", file=sys.stderr)

    # Nonresident general licenses, drawn by region rather than by area.
    regions: dict = {}
    for field, table in tables.items():
        for (area, htype), entry in table.items():
            if area.isalpha():
                regions.setdefault(area, {})[field] = draw(kinds[field], entry)

    sources = {"odds": ODDS_PAGE, "boundaries": f"{ARCGIS}/{cfg['layer']}/FeatureServer/0"}
    if cfg["seasons"]:
        sources["seasons"] = REGULATIONS_PAGE
    out = {"year": YEAR, "sources": sources, "nrRegions": dict(sorted(regions.items())), "areas": areas}
    out_json = ROOT / "data" / f"{species}-hunt-areas.json"
    out_json.write_text(json.dumps(out, separators=(",", ":")) + "\n")

    out_geojson = ROOT / "public" / "data" / f"{species}-hunt-areas.geojson"
    out_geojson.parent.mkdir(parents=True, exist_ok=True)
    slim = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"area": a["area"], "name": a["name"]}, "geometry": a["geometry"]}
            for a in areas
        ],
    }
    out_geojson.write_text(json.dumps(slim, separators=(",", ":")) + "\n")
    drawn = sum(1 for a in areas if a["hunts"])
    print(
        f"{len(areas)} areas, {drawn} with draw data, {sum(len(a['hunts']) for a in areas)} hunts, "
        f"{len(regions)} nonresident regions -> {out_json.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in SPECIES:
        sys.exit(__doc__)
    main(sys.argv[1], Path(sys.argv[2]))
