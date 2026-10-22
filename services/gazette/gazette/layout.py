"""Geometry and reading order. No scholarship thresholds are inferred here."""
import re
from statistics import median


def utf16_length(value):
    return len(value.encode("utf-16-le")) // 2


def box(values):
    return [round(float(value), 3) for value in values]


def union_box(items):
    return box((min(b[0] for b in items), min(b[1] for b in items), max(b[2] for b in items), max(b[3] for b in items)))


def inside(inner, outer):
    x, y = (inner[0] + inner[2]) / 2, (inner[1] + inner[3]) / 2
    return outer[0] <= x <= outer[2] and outer[1] <= y <= outer[3]


def gaps(lines, axis):
    intervals = sorted((line["bbox"][axis], line["bbox"][axis + 2]) for line in lines)
    end, found = intervals[0][1], []
    for left, right in intervals[1:]:
        if left > end:
            found.append((end, left))
        end = max(end, right)
    return found


def reading_order(lines, width, depth=0):
    """Recursive whitespace cuts keep separate prose columns together.

    Spanning headings split horizontal bands before each band's column cut.
    Complex magazine layouts remain heuristic; word geometry is always retained.
    """
    if len(lines) < 2 or depth > 16:
        return sorted(lines, key=lambda line: (line["bbox"][1], line["bbox"][0]))
    vertical = [gap for gap in gaps(lines, 0) if gap[1] - gap[0] >= max(18, width * .035)]
    if vertical:
        left, right = min(vertical, key=lambda gap: abs(sum(gap) / 2 - width / 2))
        groups = ([line for line in lines if line["bbox"][2] <= left + .1], [line for line in lines if line["bbox"][0] >= right - .1])
    else:
        horizontal = [gap for gap in gaps(lines, 1) if gap[1] - gap[0] >= 10]
        if not horizontal:
            return sorted(lines, key=lambda line: (line["bbox"][1], line["bbox"][0]))
        top, bottom = max(horizontal, key=lambda gap: gap[1] - gap[0])
        groups = ([line for line in lines if line["bbox"][3] <= top + .1], [line for line in lines if line["bbox"][1] >= bottom - .1])
    if not all(groups) or sum(map(len, groups)) != len(lines):
        return sorted(lines, key=lambda line: (line["bbox"][1], line["bbox"][0]))
    return [line for group in groups for line in reading_order(group, width, depth + 1)]


def lines_from_words(words):
    groups = {}
    for word in words:
        groups.setdefault(word["_line"], []).append(word)
    lines = []
    for group in groups.values():
        group.sort(key=lambda word: word["bbox"][0])
        lines.append({"text": " ".join(word["text"] for word in group), "bbox": union_box([word["bbox"] for word in group]),
                      "font_size": median([word.get("_size", 0) for word in group]), "bold": any(word.get("_bold", False) for word in group)})
    return lines


def cell_text(words):
    # Cell-local reading order, independent of a multi-column page's prose order.
    rows = []
    for word in sorted(words, key=lambda item: (item["bbox"][1], item["bbox"][0])):
        if not rows or abs(word["bbox"][1] - rows[-1][0]["bbox"][1]) > 4:
            rows.append([])
        rows[-1].append(word)
    return "\n".join(" ".join(word["text"] for word in sorted(row, key=lambda item: item["bbox"][0])) for row in rows)


def clustered(values, tolerance=2):
    groups = []
    for value in sorted(values):
        if not groups or value - groups[-1][-1] > tolerance:
            groups.append([])
        groups[-1].append(value)
    return [sum(group) / len(group) for group in groups]


def table_from_boxes(boxes, words, page, method, identifier):
    if method == "pdfplumber_text":
        # Alignment can place the last edge through a long amount. Keep whole
        # source words rather than clipping digits at that inferred boundary.
        top, bottom = min(b[1] for b in boxes), max(b[3] for b in boxes)
        original_right = right = max(b[2] for b in boxes)
        for _ in range(12):
            extended = max([right] + [word["bbox"][2] for word in words if word["bbox"][0] < right < word["bbox"][2] and top <= (word["bbox"][1] + word["bbox"][3]) / 2 <= bottom])
            if extended <= right:
                break
            right = extended
        boxes = [(b[0], b[1], right if abs(b[2] - original_right) < 1 else b[2], b[3]) for b in boxes]
    xs = clustered([x for b in boxes for x in (b[0], b[2])])
    ys = clustered([y for b in boxes for y in (b[1], b[3])])
    if len(xs) < 3 or len(ys) < 3 or (len(xs) - 1) * (len(ys) - 1) > 2000:
        return None
    rows = [[None] * (len(xs) - 1) for _ in range(len(ys) - 1)]
    cells = []
    for b in sorted(set(tuple(box(b)) for b in boxes), key=lambda b: (b[1], b[0])):
        col, right = (min(range(len(xs)), key=lambda index: abs(xs[index] - b[x])) for x in (0, 2))
        row, bottom = (min(range(len(ys)), key=lambda index: abs(ys[index] - b[y])) for y in (1, 3))
        if right <= col or bottom <= row:
            continue
        found = [word for word in words if inside(word["bbox"], b)]
        text = cell_text(found)
        rows[row][col] = text
        cells.append({"row": row, "column": col, "row_span": bottom - row, "column_span": right - col,
                      "bbox": b, "text": text, "word_indices": [word["index"] for word in found]})
    if not cells or sum(bool(cell["text"]) for cell in cells) < 3:
        return None
    if method == "pdfplumber_text":
        # Numbered prose headings are not evidence of a table of policy values.
        def numeric(value):
            return bool(re.fullmatch(r"\s*[<>=≤≥₹]*\s*\d[\d,.]*(?:\s*[-–]\s*\d[\d,.]*)?\s*(?:%|seats?)?\s*", value or "", re.I)
                        or re.search(r"(?:Rs\.?|INR|₹)\s*[\d,]+|\d[\d,.]*\s*%", value or "", re.I))
        if sum(any(numeric(value) for value in row) for row in rows) < 2:
            return None
        # Text alignment creates artificial whitespace bands between text rows.
        keep_rows = [r for r, values in enumerate(rows) if any(value and value.strip() for value in values)]
        keep_cols = [c for c in range(len(rows[0])) if any(row[c] and row[c].strip() for row in rows)]
        if len(keep_rows) < 2 or len(keep_cols) < 2:
            return None
        compact = []
        for cell in cells:
            covered_rows = [r for r in keep_rows if cell["row"] <= r < cell["row"] + cell["row_span"]]
            covered_cols = [c for c in keep_cols if cell["column"] <= c < cell["column"] + cell["column_span"]]
            if covered_rows and covered_cols:
                compact.append({**cell, "row": keep_rows.index(covered_rows[0]), "column": keep_cols.index(covered_cols[0]), "row_span": len(covered_rows), "column_span": len(covered_cols)})
        cells = compact
        rows = [[rows[r][c] for c in keep_cols] for r in keep_rows]
    return {"id": identifier, "page": page, "method": method, "bbox": union_box(boxes), "row_count": len(rows), "column_count": len(rows[0]), "rows": rows, "cells": cells, "requires_review": True}
