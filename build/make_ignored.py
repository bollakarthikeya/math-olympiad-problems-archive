"""Regenerate data/MathNet/ignored.csv with a problem `id` column.

Runs langcheck.classify() on every problem in data/MathNet/data/all and lists the
non-English ones as  id,parquet_file,language.  After this, ignored.csv is the editable
source of truth: build_site.py skips every id listed in it.

Usage:  .venv/bin/python build/make_ignored.py
"""
import csv
import glob
import os
import shutil
import sys

import pyarrow.parquet as pq

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATHNET = os.path.join(ROOT, "data", "MathNet")
sys.path.insert(0, MATHNET)
from langcheck import classify  # noqa: E402

OUT = os.path.join(MATHNET, "ignored.csv")
BACKUP = os.path.join(MATHNET, "ignored_original.csv")


def main():
    if os.path.exists(OUT) and not os.path.exists(BACKUP):
        shutil.copy(OUT, BACKUP)
    rows, total = [], 0
    for path in sorted(glob.glob(os.path.join(MATHNET, "data", "all", "*.parquet"))):
        rel = os.path.relpath(path, os.path.join(MATHNET, "data"))
        t = pq.read_table(path, columns=["id", "problem_markdown", "language"]).to_pydict()
        for pid, text, label in zip(t["id"], t["problem_markdown"], t["language"]):
            total += 1
            is_en, lang = classify(text, label)
            if not is_en:
                rows.append((pid, rel, lang))
    with open(OUT, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "parquet_file", "language"])
        w.writerows(rows)
    print(f"{total} problems checked, {len(rows)} non-English written to {OUT}")


if __name__ == "__main__":
    main()
