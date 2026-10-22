from PIL import Image, ImageOps
from .layout import box, clustered, table_from_boxes
from .models import ParseError


def recognise(page, settings, languages):
    import pymupdf
    import pytesseract
    scale = settings.ocr_dpi / 72
    if page.rect.width * page.rect.height * scale * scale > settings.max_render_pixels:
        raise ParseError("RENDER_LIMIT", "Page exceeds the configured OCR pixel budget.")
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False, colorspace=pymupdf.csRGB)
    image = ImageOps.autocontrast(Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("L"))
    try:
        data = pytesseract.image_to_data(image, lang=languages, config="--psm 3", output_type=pytesseract.Output.DICT, timeout=settings.ocr_timeout_seconds)
    except pytesseract.TesseractNotFoundError as error:
        raise ParseError("OCR_UNAVAILABLE", "Tesseract is not installed.") from error
    except pytesseract.TesseractError as error:
        raise ParseError("OCR_FAILED", "Tesseract could not read this page or the configured language pack is unavailable.") from error
    except RuntimeError as error:
        raise ParseError("OCR_TIMEOUT", "The OCR page time budget was exceeded.") from error
    words = []
    for index, raw in enumerate(data["text"]):
        text = raw.strip()
        if not text:
            continue
        x, y, w, h = (data[key][index] for key in ("left", "top", "width", "height"))
        confidence = max(0, min(100, float(data["conf"][index])))
        words.append({"index": len(words), "text": text, "bbox": box((x / scale, y / scale, (x + w) / scale, (y + h) / scale)), "confidence": confidence,
                      "_line": (data["block_num"][index], data["par_num"][index], data["line_num"][index]), "_size": h / scale * .75})
    return words, image, scale


def grid_tables(image, scale, words, page_number):
    """Ruled scan tables only. Unruled OCR keeps word geometry for manual review."""
    import cv2
    import numpy as np
    cv2.setNumThreads(1)
    grey = np.asarray(image)
    binary = cv2.adaptiveThreshold(grey, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 35, 15)
    h, w = grey.shape
    horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, w // 25), 1)))
    vertical = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(20, h // 30))))
    grid = cv2.bitwise_or(horizontal, vertical)
    contours, _ = cv2.findContours(grid, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    tables = []
    for contour in sorted(contours, key=lambda c: cv2.boundingRect(c)[1]):
        x, y, tw, th = cv2.boundingRect(contour)
        if tw < w * .2 or th < 40:
            continue
        xs = clustered(np.where(np.count_nonzero(vertical[y:y + th, x:x + tw], axis=0) > th * .3)[0].tolist(), 4)
        ys = clustered(np.where(np.count_nonzero(horizontal[y:y + th, x:x + tw], axis=1) > tw * .4)[0].tolist(), 4)
        if len(xs) < 3 or len(ys) < 3 or (len(xs) - 1) * (len(ys) - 1) > 2000:
            continue
        # Merge adjacent grid slots when the divider does not cross the slot.
        cols, rows = len(xs) - 1, len(ys) - 1
        parent = list(range(cols * rows))
        def root(slot):
            while parent[slot] != slot:
                parent[slot] = parent[parent[slot]]
                slot = parent[slot]
            return slot
        def join(a, b):
            parent[root(a)] = root(b)
        for row in range(rows):
            for col in range(cols):
                slot = row * cols + col
                if col + 1 < cols:
                    vx = int(x + xs[col + 1])
                    top, bottom = int(y + ys[row] + 3), int(y + ys[row + 1] - 3)
                    if bottom > top and np.count_nonzero(vertical[top:bottom, max(0, vx - 2):vx + 3], axis=1).astype(bool).mean() < .4:
                        join(slot, slot + 1)
                if row + 1 < rows:
                    hy = int(y + ys[row + 1])
                    left, right = int(x + xs[col] + 3), int(x + xs[col + 1] - 3)
                    if right > left and np.count_nonzero(horizontal[max(0, hy - 2):hy + 3, left:right], axis=0).astype(bool).mean() < .4:
                        join(slot, slot + cols)
        groups = {}
        for slot in range(cols * rows):
            groups.setdefault(root(slot), []).append((slot // cols, slot % cols))
        boxes = []
        for group in groups.values():
            r0, r1 = min(r for r, _ in group), max(r for r, _ in group) + 1
            c0, c1 = min(c for _, c in group), max(c for _, c in group) + 1
            if len(group) != (r1 - r0) * (c1 - c0):
                continue
            boxes.append(box(((x + xs[c0]) / scale, (y + ys[r0]) / scale, (x + xs[c1]) / scale, (y + ys[r1]) / scale)))
        table = table_from_boxes(boxes, words, page_number, "ocr_grid", f"p{page_number}-t{len(tables) + 1}") if boxes else None
        if table:
            tables.append(table)
    return tables
