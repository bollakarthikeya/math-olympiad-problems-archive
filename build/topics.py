"""Topic-name normalisation shared by the site build.

Splits MathNet's `topics_flat` paths ("A > B > C") into individual topic names and
title-cases each name for display ("Cartesian coordinates" -> "Cartesian Coordinates").
"""
import re

# Joining words stay lowercase unless they open the name or follow a colon.
MINOR = {"a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "vs", "with",
         "mod", "der", "van", "von"}
# Tokens kept exactly as written (conventional lowercase notation).
KEEP = {"gcd", "lcm", "n", "p", "p^n"}


# Misspelled or variant names in the dataset, mapped (after title-casing) to one canonical name.
ALIASES = {
    "Cyclic Quadrilaterials": "Cyclic Quadrilaterals",
    "Cyclic Quadrilaterillaterals": "Cyclic Quadrilaterals",
    "Cyclic Quadrilaterilaterals": "Cyclic Quadrilaterals",
    "Inscribed/Circumscribed Quadrilaterials": "Inscribed/Circumscribed Quadrilaterals",
    "Inscribed/Circumscribed Quadrilaterrals": "Inscribed/Circumscribed Quadrilaterals",
    "Jensen/Smoothing": "Jensen / Smoothing",
    "Triangle Centers: Centroid, Incenter, Circumcenter, Euler Line, Nine-Point Circle":
        "Triangle Centers: Centroid, Incenter, Circumcenter, Orthocenter, Euler Line, Nine-Point Circle",
    "Techniques: Modulo, Size Analysis": "Techniques: Modulo, Size Analysis, Order Analysis, Inequalities",
    "QM-AM-GM / Power Mean": "QM-AM-GM-HM / Power Mean",
    "Irreducibility: Rational Root Theorem, Gauss’s Lemma":
        "Irreducibility: Rational Root Theorem, Gauss's Lemma, Eisenstein",
}


def _cap(word):
    return word[0].upper() + word[1:] if word and word[0].islower() else word


def title_case(name):
    name = re.sub(r"\s+", " ", name).strip()
    out, start = [], True                     # start: next word opens the name or a clause
    for tok in re.split(r"(\s+)", name):
        if not tok or tok.isspace():
            out.append(tok)
            continue
        core = tok.strip("()[],:;")
        if core in KEEP:
            out.append(tok)
        elif core.lower() in MINOR and not start:
            out.append(tok)
        else:
            # capitalise each part of hyphen/slash compounds: nine-point -> Nine-Point
            out.append(re.sub(r"(^|[-/(])([a-z])", lambda m: m.group(1) + m.group(2).upper(), tok))
        start = tok.endswith(":")
    return "".join(out)


def split_topics(topics_flat):
    """All distinct topic names (title-cased) a problem belongs to, in path order."""
    seen = []
    for path in topics_flat or []:
        for part in path.split(">"):
            t = title_case(part)
            t = ALIASES.get(t, t)
            if t and t not in seen:
                seen.append(t)
    return seen
