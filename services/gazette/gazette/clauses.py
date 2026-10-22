"""Conservative heading segmentation and *candidate* circular metadata."""
import calendar
import re
from datetime import date
from statistics import median
from .layout import inside, union_box, utf16_length
from .models import ParseError

KINDS = {
    "annexure": r"annexure|appendix|schedule [a-z]$",
    "eligibility": r"eligib|qualification|selection criteria",
    "benefits": r"benefits?|financial assistance|scholarship amount|rate of scholarship",
    "documents": r"documents?|checklist|enclosures?",
    "dates": r"important dates|application schedule|deadlines?",
}
NUMBERED = re.compile(r"^\s*(\d+(?:\.\d+)*|[IVX]+)[.)\s]+\s*(\S.*)$")
REFERENCE = re.compile(r"\b(?:F\.?\s*No\.?|(?:Notification|Circular|Order|Reference|Ref\.?)\s*(?:No\.?|Number)?)\s*[:#-]?\s*([\w][\w/.()\-]*\d[\w/.()\-]*)", re.I)
AUTHORITY = re.compile(r"\b(?:Ministry of|Department of|Directorate of|Government of|All India Council for Technical Education|University Grants Commission|AICTE|UGC)\b", re.I)
DEADLINE = re.compile(r"\b(?:last date|deadlines?|closing date|open (?:till|until)|apply (?:by|before)|extended (?:to|till|until)|verification (?:until|till))\b", re.I)
DATE = re.compile(r"\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{1,2}(?:st|nd|rd|th)?[\s-]+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,-]+\d{4})\b", re.I)


def date_candidate(raw):
    parts = re.split(r"[-/.\s,]+", re.sub(r"(?<=\d)(st|nd|rd|th)\b", "", raw, flags=re.I))
    try:
        if len(parts[0]) == 4:
            year, month, day = map(int, parts)
        elif parts[1].isdigit():
            day, month, year = map(int, parts)
            if day <= 12 and month <= 12 and day != month:
                return None, "Ambiguous numeric date; no day/month order assumed."
        else:
            day, year = int(parts[0]), int(parts[2])
            month = [name.lower()[:3] for name in calendar.month_name].index(parts[1].lower()[:3])
        return date(year, month, day).isoformat(), None
    except (ValueError, IndexError):
        return None, "The stated date could not be validated."


def analyse(text, pages, tables):
    encoded = text.encode("utf-16-le")
    take = lambda start, end: encoded[start * 2:end * 2].decode("utf-16-le")
    headings, meta = [], {"notification_numbers": [], "issuing_authorities": [], "deadline_dates": []}
    for page in pages:
        lines = page["lines"]
        typical = median([line["font_size"] for line in lines]) if lines else 0
        page_tables = [table["bbox"] for table in tables if table["page"] == page["number"]]
        for index, line in enumerate(lines):
            value = line["text"]
            numbered = NUMBERED.match(value)
            kind = next((kind for kind, pattern in KINDS.items() if re.search(pattern, value, re.I)), "other")
            in_table = any(inside(line["bbox"], b) for b in page_tables)
            short = len(value) <= 150 and len(value.split()) <= 16
            styled = line["font_size"] > typical + 2 or line["bold"] and line["font_size"] >= typical + 1 or value.isupper() and len(value.split()) <= 10
            if short and not in_table and (numbered or kind != "other" and (styled or len(value.split()) <= 6) or styled):
                level = min(8, numbered[1].count(".") + 1) if numbered else 1
                headings.append({"title": value, "heading_text": value, "kind": kind, "level": level, "start": line["start"], "page": page["number"]})
            hit = {"quote": take(line["start"], line["end"]), "page": page["number"], "bbox": line["bbox"], "start": line["start"], "end": line["end"], "method": page["method"], "requires_review": True}
            reference = REFERENCE.search(value)
            if reference:
                meta["notification_numbers"].append({**hit, "value": reference[1]})
            if index < 12 and page["number"] <= 2 and AUTHORITY.search(value):
                meta["issuing_authorities"].append({**hit, "value": value})
            if DEADLINE.search(value):
                context = line
                if not DATE.search(value) and index + 1 < len(lines) and lines[index + 1]["bbox"][1] - line["bbox"][3] < 25:
                    following = lines[index + 1]
                    value = take(line["start"], following["end"])
                    context = {**line, "end": following["end"], "bbox": union_box([line["bbox"], following["bbox"]])}
                for match in DATE.finditer(value):
                    iso, note = date_candidate(match[0])
                    meta["deadline_dates"].append({**hit, "value": match[0], "quote": take(context["start"], context["end"]), "end": context["end"], "bbox": context["bbox"], "date_text": match[0], "iso_date": iso, "date_note": note})
    # A parent section's range includes its children; sibling ranges do not overlap.
    if not headings or headings[0]["start"] > 0:
        headings.insert(0, {"title": "Preamble", "heading_text": None, "kind": "preamble", "level": 0, "start": 0, "page": 1})
    if len(headings) > 500:
        raise ParseError("CLAUSE_LIMIT", "The document exceeds the clause hierarchy budget.")
    sections, stack = [], []
    for index, heading in enumerate(headings):
        end = next((other["start"] for other in headings[index + 1:] if other["level"] <= heading["level"]), utf16_length(text))
        # Preamble is a generated label, not a parent or a source quotation.
        if heading["kind"] == "preamble":
            end = headings[index + 1]["start"] if index + 1 < len(headings) else end
        while stack and stack[-1]["level"] >= heading["level"]:
            stack.pop()
        parent = stack[-1]["id"] if stack and stack[-1]["kind"] != "preamble" else None
        section = {"id": f"s{index + 1}", "parent_id": parent, "level": heading["level"], "title": heading["title"], "kind": heading["kind"], "heading_text": heading["heading_text"], "start": heading["start"], "end": end,
                   "page_start": heading["page"], "page_end": max((p["number"] for p in pages if p["start"] < end), default=heading["page"]), "text": take(heading["start"], end)}
        sections.append(section)
        stack.append(section)
    return sections, meta
