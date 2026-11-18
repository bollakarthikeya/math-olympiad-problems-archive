"""Generate the site's data and figures from MathNet.

Reads   data/MathNet/data/all/*.parquet  and  data/MathNet/ignored.csv
Writes  site/data/index.js         filter index for every English problem (loaded on page open)
        site/data/search.js        lowercase problem text for the search box (loaded on first search)
        site/data/p/<first 2 chars>/<id>.js  one file per problem: competition, statement, solutions, figures
        site/img/<id>_<n>.<ext>    figures

Data files are JavaScript (not JSON) so the site also works when index.html is opened
straight from disk, without a web server.

Usage:  .venv/bin/python build/build_site.py
"""
import csv
import glob
import json
import os
import re
import shutil

import pyarrow.parquet as pq

from topics import split_topics

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATHNET = os.path.join(ROOT, "data", "MathNet")
SITE = os.path.join(ROOT, "site")
UNKNOWN_YEAR = "Year Unknown"   # label for problems whose competition name has no year
YEAR = re.compile(r"(?<!\d)(19[89]\d|20[0-2]\d)(?!\d)")


def js(name, obj):
    return f"{name}({json.dumps(obj, ensure_ascii=False, separators=(',', ':'))});\n"


def img_ext(b):
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if b[:3] == b"\xff\xd8\xff":
        return "jpg"
    if b[:4] == b"GIF8":
        return "gif"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        return "webp"
    return "png"


def clean(text):
    return re.sub(r"^\s*(Problem|Solution)\s*[:.]\s*", "", text or "").strip()


def main():
    with open(os.path.join(MATHNET, "ignored.csv")) as f:
        ignored = {r["id"] for r in csv.DictReader(f)}

    for sub in ("data", "img"):
        shutil.rmtree(os.path.join(SITE, sub), ignore_errors=True)
    os.makedirs(os.path.join(SITE, "img"))
    os.makedirs(os.path.join(SITE, "data", "p"))

    rows, n_img, seen = [], 0, set()
    for path in sorted(glob.glob(os.path.join(MATHNET, "data", "all", "*.parquet"))):
        for r in pq.read_table(path).to_pylist():
            pid = r["id"]
            if pid in ignored or pid in seen:
                continue
            seen.add(pid)
            images = []
            for i, im in enumerate(r["images"] or []):
                b = im["bytes"]
                name = f"img/{pid}_{i + 1}.{img_ext(b)}"
                with open(os.path.join(SITE, name), "wb") as out:
                    out.write(b)
                images.append(name)
                n_img += 1
            sols = [clean(s) for s in (r["solutions_markdown"] or []) if s and s.strip()]
            d = os.path.join(SITE, "data", "p", pid[:2])
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, pid + ".js"), "w") as out:
                out.write(js("__p", {"id": pid, "competition": r["competition"] or "",
                                     "problem": clean(r["problem_markdown"]),
                                     "solutions": sols, "images": images}))
            m = YEAR.search(r["competition"] or "")
            rows.append({"id": pid, "year": m.group(1) if m else UNKNOWN_YEAR,
                         "country": r["country"] or "Unknown", "topics": split_topics(r["topics_flat"]),
                         "nsol": len(sols), "text": clean(r["problem_markdown"]).lower()})

    # default order: newest year first (Unknown last), then country A-Z
    rows.sort(key=lambda r: (r["year"] == UNKNOWN_YEAR, -int(r["year"]) if r["year"] != UNKNOWN_YEAR else 0,
                             r["country"].lower(), r["id"]))

    def count(key, multi=False):
        c = {}
        for r in rows:
            for v in (r[key] if multi else [r[key]]):
                c[v] = c.get(v, 0) + 1
        return c

    yc, cc, tc = count("year"), count("country"), count("topics", True)
    years = sorted((y for y in yc if y != UNKNOWN_YEAR), reverse=True) + ([UNKNOWN_YEAR] if UNKNOWN_YEAR in yc else [])
    countries = sorted(cc, key=str.lower)
    topics = sorted(tc, key=lambda t: (-tc[t], t))
    yi, ci, ti = ({v: i for i, v in enumerate(l)} for l in (years, countries, topics))

    index = {
        "years": [[y, yc[y]] for y in years],
        "countries": [[c, cc[c]] for c in countries],
        "topics": [[t, tc[t]] for t in topics],
        # one row per problem: [id, year#, country#, [topic#...], number of solutions]
        "p": [[r["id"], yi[r["year"]], ci[r["country"]], [ti[t] for t in r["topics"]], r["nsol"]] for r in rows],
    }
    with open(os.path.join(SITE, "data", "index.js"), "w") as out:
        out.write(js("window.__index", index))
    with open(os.path.join(SITE, "data", "search.js"), "w") as out:
        out.write(js("window.__search", [r["text"] for r in rows]))

    print(f"{len(rows)} problems, {n_img} figures, {len(years)} years, {len(countries)} countries, "
          f"{len(topics)} topics ({len(ignored)} ignored)")


if __name__ == "__main__":
    main()
