import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "contract" / "OwnThePromise.py").read_text(encoding="utf-8")
rubric = source[source.index('RUBRIC = f"""'):source.index("@allow_storage")]

categories = [
    "reports",
    "quotes",
    "predicts",
    "expects",
    "recommends",
    "describes",
    "assigns",
    "undertaking",
    "undertakes",
    "thinks",
    "foresees",
    "advises",
]

cases = [
    (
        "A1",
        "We understand the central laboratory will release the final assay results "
        "to investigators before database lock.",
        "NOT_AUTHOR",
    ),
    (
        "A2",
        "The Sponsor shall release the final assay results to investigators before database lock.",
        "AUTHOR",
    ),
    (
        "A3",
        "We are on track to release the final assay results well before database lock.",
        "NOT_AUTHOR",
    ),
    (
        "A4",
        "We will release the final assay results to investigators before database lock.",
        "AUTHOR",
    ),
    (
        "A5",
        "Assay results are normally released to investigators before database lock.",
        "NOT_AUTHOR",
    ),
]


def tokens(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", value.lower()))


def jaccard(left: str, right: str) -> float:
    a, b = tokens(left), tokens(right)
    return len(a & b) / len(a | b) if a | b else 0.0


def separates(predicate) -> bool:
    direct = all(
        ("AUTHOR" if predicate(text) else "NOT_AUTHOR") == label
        for _, text, label in cases
    )
    inverse = all(
        ("NOT_AUTHOR" if predicate(text) else "AUTHOR") == label
        for _, text, label in cases
    )
    return direct or inverse


for case_id, text, _ in cases:
    leaked = [word for word in categories if word in text.lower()]
    if leaked:
        raise AssertionError(f"{case_id} leaks rubric category words: {leaked}")

lines = [line.strip() for line in rubric.splitlines() if len(line.strip()) > 25]
worst = max(max(jaccard(text, line) for line in lines) for _, text, _ in cases)
if worst >= 0.40:
    raise AssertionError(f"rubric similarity too high: {worst:.3f}")

first_person = lambda text: bool(re.search(r"\b(we|our|us|i|my)\b", text.lower()))
if separates(first_person):
    raise AssertionError("grammatical person separates the labels")

for measure in (len, lambda value: len(value.split())):
    values = [(measure(text), label) for _, text, label in cases]
    for threshold in range(min(value for value, _ in values) - 1, max(value for value, _ in values) + 2):
        for direction in ("gt", "lt"):
            predicate = lambda text, t=threshold, d=direction, m=measure: (
                m(text) > t if d == "gt" else m(text) < t
            )
            if separates(predicate):
                raise AssertionError(f"length shortcut separates at {threshold}/{direction}")

all_tokens = set().union(*(tokens(text) for _, text, _ in cases))
for token in all_tokens:
    if separates(lambda text, token=token: token in tokens(text)):
        raise AssertionError(f"single-token shortcut: {token}")

bigrams = set()
for _, text, _ in cases:
    words = re.findall(r"[a-z0-9]+", text.lower())
    bigrams |= {words[index] + " " + words[index + 1] for index in range(len(words) - 1)}
for bigram in bigrams:
    if separates(
        lambda text, bigram=bigram: bigram
        in " ".join(re.findall(r"[a-z0-9]+", text.lower()))
    ):
        raise AssertionError(f"single-bigram shortcut: {bigram}")

first_words = {text.split()[0] for _, text, _ in cases}
for first_word in first_words:
    if separates(lambda text, first_word=first_word: text.split()[0] == first_word):
        raise AssertionError(f"first-word shortcut: {first_word}")

print(f"PASS A1-A5 adversarial set; worst rubric similarity {worst:.3f}")
