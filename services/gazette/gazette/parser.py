import hashlib
import io
import json
import re
import pdfplumber
import pymupdf
from . import CONTRACT_VERSION, EXTRACTOR_VERSION
from .clauses import analyse
from .config import Settings
from .layout import box, lines_from_words, reading_order, table_from_boxes, utf16_length
from .models import Extraction, ParseError
from .ocr import grid_tables, recognise


def digital_words(page):
    attrs = {}
    content = page.get_text("dict", flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES)
    for block in content["blocks"]:
        for index, line in enumerate(block.get("lines", [])):
            spans = line.get("spans", [])
            attrs[(block["number"], index)] = (max((span["size"] for span in spans), default=0), any(span["flags"] & 16 for span in spans))
    words = []
    for item in page.get_text("words"):
        x0, y0, x1, y1, text, block, line, _ = item
        b = box((max(0, x0), max(0, y0), min(page.rect.width, x1), min(page.rect.height, y1)))
        if b[2] <= b[0] or b[3] <= b[1]:
            continue
        size, bold = attrs.get((block, line), (y1 - y0, False))
        words.append({"index": len(words), "text": text, "bbox": b, "confidence": None, "_line": (block, line), "_size": size, "_bold": bold})
    return words


def needs_ocr(page, words):
    text = " ".join(word["text"] for word in words)
    image_area = sum(max(0, item["bbox"][2] - item["bbox"][0]) * max(0, item["bbox"][3] - item["bbox"][1]) for item in page.get_image_info())
    area = page.rect.width * page.rect.height
    return (image_area > area * .3 and len(text) < 800) or (image_area > 0 and len(text.strip()) < 20) or text.count("\ufffd") > max(2, len(text) * .03) or (not words and bool(page.get_drawings()))


def extract_pdf(data: bytes, settings: Settings, languages: str | None = None):
    if len(data) > settings.max_upload_bytes:
        raise ParseError("UPLOAD_LIMIT", "The PDF exceeds its byte budget.", 413)
    if not data.startswith(b"%PDF-"):
        raise ParseError("INVALID_PDF", "The request body is not a PDF.")
    languages = languages or settings.ocr_languages
    if not re.fullmatch(r"[a-z]{3}(?:\+[a-z]{3}){0,7}", languages):
        raise ParseError("INVALID_OCR_LANGUAGES", "Use installed three-letter Tesseract language codes separated by '+'.")
    try:
        document = pymupdf.open(stream=data, filetype="pdf")
    except Exception as error:
        raise ParseError("PDF_UNREADABLE", "The PDF could not be opened.") from error
    with document:
        if document.needs_pass:
            raise ParseError("PDF_ENCRYPTED", "Password-protected PDFs are not processed.")
        if not 0 < len(document) <= settings.max_pages:
            raise ParseError("PAGE_LIMIT", "The document exceeds the page budget or has no pages.")
        rotations = [page.rotation for page in document]
        for page in document:
            if page.rotation:
                page.remove_rotation()
        # Both engines see the same display orientation. The original bytes/hash remain untouched.
        with pdfplumber.open(io.BytesIO(document.tobytes())) as spatial:
            pages, tables, warnings, text_parts = [], [], [], []
            offset, partial = 0, False
            for index, page in enumerate(document):
                number = index + 1
                words = digital_words(page)
                method = "digital" if words else "blank"
                image, scale = None, None
                if needs_ocr(page, words):
                    try:
                        recognised, image, scale = recognise(page, settings, languages)
                        if not recognised:
                            raise ParseError("OCR_EMPTY", "No text could be recognised on this scanned page.")
                        words, method = recognised, "ocr"
                        warnings.append({"code": "OCR_REVIEW_REQUIRED", "page": number, "message": "Machine-recognised text and numeric values require source review."})
                    except ParseError as error:
                        partial = True
                        method = "digital" if words else "unreadable"
                        warnings.append({"code": error.code, "page": number, "message": error.message})
                if len(words) > 12000:
                    raise ParseError("WORD_LIMIT", "A page exceeds the word geometry budget.")
                if method == "blank":
                    warnings.append({"code": "BLANK_PAGE", "page": number, "message": "No text or scanned content was detected on this page."})
                try:
                    if image is not None and method == "ocr":
                        found = grid_tables(image, scale, words, number)
                    else:
                        found, strategy = [], "pdfplumber_lines"
                        spatial_page = spatial.pages[index]
                        if spatial_page.cropbox and spatial_page.cropbox != spatial_page.bbox:
                            spatial_page = spatial_page.crop(spatial_page.cropbox, strict=False)
                        origin_x, origin_y = spatial_page.bbox[:2]
                        candidates = spatial_page.find_tables()
                        if not candidates:
                            strategy = "pdfplumber_text"
                            candidates = spatial_page.find_tables({"vertical_strategy": "text", "horizontal_strategy": "text", "min_words_vertical": 3, "min_words_horizontal": 2})
                        for candidate in candidates:
                            boxes = [(b[0] - origin_x, b[1] - origin_y, b[2] - origin_x, b[3] - origin_y) for b in candidate.cells]
                            table = table_from_boxes(boxes, words, number, strategy, f"p{number}-t{len(found) + 1}")
                            if table:
                                found.append(table)
                    if len(found) > 20:
                        raise ParseError("TABLE_LIMIT", "A page exceeds the table budget.")
                    tables.extend(found)
                except ParseError:
                    raise
                except Exception:
                    partial = True
                    warnings.append({"code": "TABLE_EXTRACTION_FAILED", "page": number, "message": "Table geometry could not be reconstructed; text geometry was retained."})
                lines = reading_order(lines_from_words(words), page.rect.width)
                if text_parts:
                    offset += 2
                start, page_parts = offset, []
                for line in lines:
                    if page_parts:
                        offset += 1
                    line["start"] = offset
                    offset += utf16_length(line["text"])
                    line["end"] = offset
                    page_parts.append(line["text"])
                text = "\n".join(page_parts)
                text_parts.append(text)
                if offset > settings.max_text_chars:
                    raise ParseError("TEXT_LIMIT", "The document exceeds the extracted text budget.")
                public_words = [{key: value for key, value in word.items() if not key.startswith("_")} for word in words]
                pages.append({"number": number, "width": round(page.rect.width, 3), "height": round(page.rect.height, 3), "original_rotation": rotations[index], "method": method, "text": text, "start": start, "end": offset, "words": public_words, "lines": lines})
            text = "\n\n".join(text_parts)
            if not text.strip():
                raise ParseError("NO_EXTRACTABLE_TEXT", "No readable text was found; the original PDF requires manual review.")
            sections, metadata = analyse(text, pages, tables)
            profile = {"extractor_version": EXTRACTOR_VERSION, "languages": languages, "dpi": settings.ocr_dpi, "ocr_timeout": settings.ocr_timeout_seconds, "max_pixels": settings.max_render_pixels}
            result = Extraction(contract_version=CONTRACT_VERSION, extractor_version=EXTRACTOR_VERSION, profile_sha256=hashlib.sha256(json.dumps(profile, sort_keys=True).encode()).hexdigest(),
                                source_sha256=hashlib.sha256(data).hexdigest(), byte_length=len(data), status="partial" if partial else "complete", offset_unit="utf16", coordinate_space="page_points_top_left", ocr_languages=languages,
                                requires_review=partial or bool(tables) or any(page["method"] == "ocr" for page in pages), text=text, pages=pages, tables=tables, sections=sections, metadata=metadata, warnings=warnings)
            if len(result.model_dump_json().encode()) > settings.max_result_bytes:
                raise ParseError("RESULT_LIMIT", "The extracted geometry exceeds the response budget.")
            return result
