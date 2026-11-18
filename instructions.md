# Olympiad Problem Archive — Instructions

The Olympiad Problem Archive is a website for browsing 21,937 English-language math olympiad problems
(with solutions and figures) from the MathNet dataset. It lives in the `site/` folder.

The site is **fully self-contained**: every library it uses (math rendering, Markdown rendering) and all
problem data and figures are already inside `site/`. Nothing is loaded from the internet.

---

## 1. Dependencies

There are two different jobs, and they need different things.

### A. To view or host the site — nothing to install

| What | Needed? |
|---|---|
| A modern web browser (Chrome, Edge, Firefox, Safari) | **Yes** |
| A web server (Apache, Nginx, XAMPP, LAMP, Tomcat, IIS…) | Only if you want to publish it for other people. Any server that can serve plain files works. |
| Python, Node.js, PHP, Java, a database | **No** |

### B. To rebuild the site data (only after changing `ignored.csv`, the topic corrections, or the dataset)

| What | Version |
|---|---|
| Python | 3.10 or newer (built and tested with 3.14) |
| Python packages | `pyarrow` and `langdetect` (listed in `build/requirements.txt`) |
| The MathNet dataset | Already in `data/MathNet/` (parquet files in `data/MathNet/data/all/`) |

#### Installation commands (one time)

Run these from the project folder (the folder that contains `site/`, `build/` and `data/`).

**macOS / Linux**

```bash
# 1. Check Python is installed (must print 3.10 or newer)
python3 --version

# 2. Create a private Python environment inside the project
python3 -m venv .venv

# 3. Install the build packages into it
.venv/bin/pip install -r build/requirements.txt
```

**Windows (PowerShell or Command Prompt)**

```bat
:: 1. Check Python is installed (must print 3.10 or newer)
py --version

:: 2. Create a private Python environment inside the project
py -m venv .venv

:: 3. Install the build packages into it
.venv\Scripts\pip install -r build\requirements.txt
```

If Python is missing, install it from <https://www.python.org/downloads/> (on Windows, tick
"Add Python to PATH" during setup) or on macOS with `brew install python`.

---

## 2. What is in the project folder

```
math_olypiad_problems/
├── instructions.md          ← this file
├── site/                    ← THE WEBSITE (this is the only folder you publish)
│   ├── index.html           ← main page: browse and filter problems
│   ├── countries.html       ← table of countries & contests
│   ├── topics.html          ← table of topics
│   ├── app.js, list.js      ← page logic
│   ├── style.css            ← shared look (light and dark mode)
│   ├── data/                ← generated: filter index, search index, one file per problem
│   ├── img/                 ← generated: problem and solution figures
│   ├── vendor/              ← bundled libraries (KaTeX 0.16.11, marked 12.0.2)
│   └── SUMMARY.md           ← how this site was designed and built
├── build/                   ← scripts that generate site/data and site/img
│   ├── build_site.py
│   ├── make_ignored.py
│   ├── topics.py
│   └── requirements.txt
└── data/MathNet/            ← source dataset
    ├── data/all/*.parquet   ← all 27,817 problems
    ├── ignored.csv          ← problems left out of the site (non-English), by id
    └── langcheck.py         ← English / non-English check
```

The site is about **339 MB** (238 MB of figures, 92 MB of problem files).

---

## 3. Launching the site — step by step

### Option 1 — Open it directly on your computer (quickest)

1. Open the `site` folder.
2. Double-click **`index.html`**. It opens in your default browser.
3. That's it. Filters, search, solutions, figures and the tables all work without a server.

### Option 2 — Run a small local web server (optional)

Useful if you want a normal `http://` address, e.g. to test as visitors will see it.

```bash
# macOS / Linux
cd site
python3 -m http.server 8000
```

```bat
:: Windows
cd site
py -m http.server 8000
```

Then open <http://localhost:8000> in your browser. Press `Ctrl + C` in the terminal to stop it.

### Option 3 — Publish it on a web server

1. Copy the **entire contents** of the `site` folder (keep the sub-folders `data`, `img`, `vendor` intact)
   to your server's web folder, for example:
   - Apache / LAMP: `/var/www/html/olympiad/`
   - XAMPP: `C:\xampp\htdocs\olympiad\`
   - Nginx: the folder named in your `root` setting
   - Tomcat: `webapps/olympiad/`
2. Make sure all files were copied (about 27,500 files, 339 MB). Uploading by FTP can take a while;
   zipping the folder, uploading the zip and unzipping it on the server is faster.
3. Visit `http://<your-server>/olympiad/` — the server opens `index.html` automatically.
4. No configuration, database or server-side language is needed.

### Rebuilding the data (only when something in the data changes)

Do this after the one-time installation in section 1B.

```bash
# macOS / Linux
.venv/bin/python build/build_site.py
```

```bat
:: Windows
.venv\Scripts\python build\build_site.py
```

It takes about 15 seconds and rewrites `site/data/` and `site/img/`. The HTML, CSS and JavaScript files
are not touched.

- **To hide or restore a problem:** add or delete its row in `data/MathNet/ignored.csv`
  (columns `id,parquet_file,language`), then rebuild.
- **To regenerate `ignored.csv` from scratch** with the English check (this overwrites manual edits;
  the very first original is kept as `ignored_original.csv`):
  `.venv/bin/python build/make_ignored.py`, then rebuild.
- **To fix or merge a topic name:** add a line to `ALIASES` in `build/topics.py`, then rebuild.

---

## 4. The pages and what they do

### Main page — `index.html`

The page for browsing problems.

**Header**
- Title *"Math Olympiad problems, one filter away."*
- Three clickable statistics:
  - **21,937 problems** — returns to the full list with all filters cleared.
  - **52 countries & contests** — opens the Countries & Contests table.
  - **185 topics** — opens the Topics table.

**Filter bar**
- **Search box** ("Search words or ID") — finds problems containing the typed words, or the problem with
  that exact ID (e.g. `0e94`). The search index (6.5 MB) downloads the first time you search.
- **Year** dropdown — pick one or more years; problems whose competition name has no year are under
  **Year Unknown**.
- **Country / Competition** dropdown — pick one or more countries or contests (IMO, Baltic Way, …).
- **Topics** dropdown — pick one or more topics; a problem matches if it has **any** of them.
  Each problem belongs to every level of its topic path (e.g. a cyclic-quadrilateral problem is in
  *Geometry*, *Plane Geometry*, *Quadrilaterals* and *Cyclic Quadrilaterals*).
- Every dropdown has checkboxes, its own search box, the number of problems next to each option, and a
  *Clear* button. Different dropdowns combine (Year **and** Country **and** Topic).
- **Randomize** — shows the problems that match the current filters in a random order. Each click gives a
  new order; the order stays fixed while you page through it.
- Chosen filters appear as removable chips under the bar, with **Clear all**.

**Results bar**
- *"Showing 1–20 of N problems"*.
- **Show [20 / 50 / 100] per page**.
- **Sort**: Newest first (default; Year Unknown last), Oldest first, Country A–Z
  (shows *Random order* while Randomize is active).

**Problem frames** (one per problem)
- Top line: country/contest · year · **ID** (orange) and, at the right, **Problem N** (its position in
  the current list).
- The competition name as the title.
- The problem statement with typeset mathematics and any figures.
- Topic tags — clicking a tag adds that topic as a filter.
- **Show solution** button — opens the official solution(s) inside the frame (*Solution 1, 2, …*), with
  figures; click again to hide. Problems without a solution say *No solution provided*.

**Bottom of the list**
- Orange note: *"\* ID is the unique problem identifier associated with each problem title."*
- Page numbers (‹ 1 … 4 5 6 … 1,097 ›).

**Shareable links** — the current filters, search, sort, page size and page are stored in the address
bar (e.g. `index.html#t=Geometry&c=IMO&p=2`). Copy the address to share or bookmark exactly that view;
the browser's Back button steps through your changes.

### Countries & Contests — `countries.html`

- A table with two columns: **Country / Competition** and **Problems** (how many problems it has).
- Starts sorted by number of problems, most first. Click a column title to sort by it; click again to
  reverse.
- Search box — shows the names that **start with** the typed letters (e.g. `Ba` → Baltic Way, Balkan
  Mathematical Olympiad).
- Click a name to open the main page filtered to that country or contest.
- **← Back to problems** returns to the main page.

### Topics — `topics.html`

- Same layout and features as the Countries page, listing all **185 topics** and the number of problems
  in each. The search box also matches topic names that start with the typed letters.
- Counts add up to more than 21,937 because most problems have several topics.

### Common to all pages

- Automatic **dark mode** following the device setting.
- Works on phones and tablets (filters wrap, tables shrink).
- Footer credit: problems and solutions from **MathNet** (MIT), licensed **CC BY 4.0** — keep this credit
  when publishing.

---

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| Page shows but problems say *Loading…* forever | Some of `site/data/p/` was not copied. Re-copy the whole `site` folder. |
| Figures missing | `site/img/` was not copied completely. |
| Maths shows as raw `$…$` text | `site/vendor/` is missing. |
| `ModuleNotFoundError: pyarrow` when rebuilding | Run the installation commands in section 1B and use `.venv/bin/python`, not the system `python3`. |
| Search shows *Searching…* for a long time on a slow connection | The 6.5 MB search index is downloading the first time; it is reused afterwards. |
