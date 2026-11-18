"""Decide whether a MathNet problem statement is written in English.

The dataset's `language` column is unreliable (mostly missing, and mixed labels such as
"Macedonian, English" often hold non-English text), so the decision is made from the text:
English function words vs. common function words of the other dataset languages, with
non-Latin scripts and accented words counted as foreign. langdetect breaks ties and names
the language of ignored problems.
"""
import re

from langdetect import DetectorFactory, detect_langs

DetectorFactory.seed = 0

EN = set("""the of and is are be let that with find prove show which such for each compute evaluate
solve calculate simplify how many what there does exist exists given any if this these those from by an
it its or has have can where when who number numbers integer integers then suppose consider denote
called into than between at on was were their whose them they we our you your must should would will
both every other same some only also not no""".split())
FOREIGN = set("""de la el los las que y del una un es le les des et est du une soit sont il di che della
sia dei gli da das uma um são não em na der die und ist ein eine mit für von zu sei het een van op en
dat zijn și este care pe cu din za je ki so ali med pri kot naj kjer koliko neka koja koji što od po iz
og er af på och är til és hogy az egy ve bir için poenostavi izraz izračunaj reši riješi dokaži
pokaži določi odredi izračunajte calcule calcula calcular calculer résoudre résous montrer demuestre
demostrar dimostra dimostrare determina calcola trova berechne beweise bestimme zeige bereken bewijs
toon aan prouver quanto vale valor qual""".split())
NONLATIN = re.compile(r"[Ͱ-ϿЀ-ӿ֐-ۿ฀-๿぀-ヿ一-鿿가-힯]")
ACCENTED = re.compile(r"[à-öø-ÿāăąćčďđēęěğıłńňőœřśşșšţțťůűźżžḑ]")

LANG_NAMES = {"pt": "Portuguese", "es": "Spanish", "fr": "French", "it": "Italian", "sl": "Slovenian",
              "de": "German", "ro": "Romanian", "ru": "Russian", "nl": "Dutch", "ko": "Korean",
              "mk": "Macedonian", "zh-tw": "Chinese", "zh-cn": "Chinese", "hu": "Hungarian",
              "af": "Afrikaans", "hr": "Croatian", "bg": "Bulgarian", "da": "Danish", "vi": "Vietnamese",
              "ca": "Catalan", "no": "Norwegian", "sq": "Albanian", "fi": "Finnish", "et": "Estonian",
              "uk": "Ukrainian", "sr": "Serbian", "pl": "Polish", "cs": "Czech", "sk": "Slovak",
              "sv": "Swedish", "tr": "Turkish", "ja": "Japanese", "el": "Greek", "ar": "Arabic",
              "mn": "Mongolian", "lt": "Lithuanian", "lv": "Latvian", "id": "Indonesian", "tl": "Tagalog"}


LABEL_FIX = {"español": "Spanish", "espanol": "Spanish", "português": "Portuguese", "portugues": "Portuguese",
             "chinese (traditional)": "Chinese (Traditional)", "deutsch": "German", "français": "French"}


def strip_math(t):
    t = re.sub(r"\$\$.*?\$\$|\$[^$]*\$|\\\[.*?\\\]|\\\(.*?\\\)", " ", t, flags=re.S)
    return re.sub(r"!\[[^\]]*\]\([^)]*\)|<[^>]+>|^\s*Problem:", " ", t)


def _detect(t):
    try:
        return detect_langs(t)[0].lang
    except Exception:
        return "unknown"


def classify(text, label=None):
    """Return (is_english, language_name). `label` is the dataset's own language field."""
    t = strip_math(text or "")
    words = re.findall(r"[^\W\d_]+", t.lower())
    nonlatin = len(NONLATIN.findall(t))
    latin_words = [w for w in words if not NONLATIN.search(w)]
    en = sum(w in EN for w in latin_words)
    fo = sum(w in FOREIGN for w in latin_words) + sum(bool(ACCENTED.search(w)) for w in latin_words)
    letters = len(re.findall(r"[^\W\d_]", t))
    if nonlatin > 0.3 * max(letters, 1) and en < 5:
        is_en = False                              # mostly another script, no real English part
    elif en > fo:
        is_en = True
    elif en == 0 and fo == 0:
        # nothing marks it either way: trust langdetect when there is real text, else it is a formula
        is_en = len(latin_words) < 3 or _detect(t) == "en"
    else:
        is_en = False
    if is_en:
        return True, "English"
    if isinstance(label, str) and label.strip() and not re.search(r"[,;]|english", label, re.I):
        name = label.strip()
        return False, LABEL_FIX.get(name.lower(), name)   # single, clear dataset label
    code = _detect(t)
    if code == "en":
        code = "unknown"
    return False, LANG_NAMES.get(code, code)
