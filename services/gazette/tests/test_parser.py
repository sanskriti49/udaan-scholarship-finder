import hashlib
import io
import pytest
import pymupdf
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from gazette.clauses import date_candidate
from gazette.config import Settings
from gazette.models import Extraction, ParseError
from gazette.parser import extract_pdf
from gazette.clauses import analyse
from gazette.layout import utf16_length
from .fixture_factory import digital_pdf, scanned_pdf

SETTINGS = Settings(ocr_languages="eng")


def test_digital_geometry_hierarchy_metadata_and_columns():
    source = digital_pdf()
    result = extract_pdf(source, SETTINGS)
    assert result.source_sha256 == hashlib.sha256(source).hexdigest()
    assert result.status == "complete"
    assert [page.method for page in result.pages] == ["digital", "digital"]
    assert result.text.index("LEFT COLUMN END") < result.text.index("RIGHT COLUMN START")
    assert not any(table.page == 2 for table in result.tables), "two-column numbered prose must not masquerade as a criteria table"
    table = next(table for table in result.tables if table.method == "pdfplumber_lines")
    assert table.rows == [["Category", "Minimum marks", "Annual income ceiling"], ["General", "75%", "Rs. 250000"], ["SC / ST", "65%", "Rs. 300000"], ["OBC", "70%", "Rs. 280000"]]
    assert table.row_count == 4 and table.column_count == 3
    assert all(cell.word_indices for cell in table.cells)
    eligibility = next(section for section in result.sections if section.title == "1. Eligibility")
    child = next(section for section in result.sections if section.title.startswith("1.1"))
    assert child.parent_id == eligibility.id
    assert eligibility.start <= child.start < child.end <= eligibility.end
    assert any(section.kind == "documents" for section in result.sections)
    assert any(section.kind == "annexure" for section in result.sections)
    assert result.metadata.notification_numbers[0].value == "EDU/2026/42"
    assert result.metadata.issuing_authorities
    assert result.metadata.deadline_dates[0].iso_date == "2026-10-31"
    ambiguous = next(hit for hit in result.metadata.deadline_dates if hit.value == "01/02/2027")
    assert ambiguous.iso_date is None and "Ambiguous" in ambiguous.date_note
    encoded = result.text.encode("utf-16-le")
    for section in result.sections:
        assert encoded[section.start * 2:section.end * 2].decode("utf-16-le") == section.text
    for group in result.metadata.model_dump().values():
        for hit in group:
            assert encoded[hit["start"] * 2:hit["end"] * 2].decode("utf-16-le") == hit["quote"]


def test_actual_tesseract_recovers_scanned_text_and_grid():
    result = extract_pdf(scanned_pdf(digital_pdf()), SETTINGS)
    assert result.status == "complete"
    assert result.pages[0].method == "ocr"
    assert "Eligibility" in result.text
    assert result.requires_review
    assert any(word.confidence is not None for word in result.pages[0].words)
    table = next(table for table in result.tables if table.method == "ocr_grid")
    assert table.row_count == 4 and table.column_count == 3
    assert "75%" in str(table.rows) and "250000" in str(table.rows)
    assert any(warning.code == "OCR_REVIEW_REQUIRED" for warning in result.warnings)


def test_mixed_document_ocr_only_runs_on_scanned_page(monkeypatch):
    original = __import__("gazette.parser", fromlist=["recognise"]).recognise
    calls = []
    def recognise(page, settings, languages):
        calls.append(page.number)
        return original(page, settings, languages)
    monkeypatch.setattr("gazette.parser.recognise", recognise)
    with pymupdf.open(stream=digital_pdf(), filetype="pdf") as mixed, pymupdf.open(stream=scanned_pdf(digital_pdf()), filetype="pdf") as scan:
        mixed.insert_pdf(scan)
        result = extract_pdf(mixed.tobytes(), SETTINGS)
    assert calls == [2]
    assert [page.method for page in result.pages] == ["digital", "digital", "ocr"]


def test_partial_ocr_failure_retains_digital_pages(monkeypatch):
    def unavailable(*args):
        raise ParseError("OCR_UNAVAILABLE", "OCR binary unavailable.")
    monkeypatch.setattr("gazette.parser.recognise", unavailable)
    with pymupdf.open(stream=digital_pdf(), filetype="pdf") as mixed, pymupdf.open(stream=scanned_pdf(digital_pdf()), filetype="pdf") as scan:
        mixed.insert_pdf(scan)
        result = extract_pdf(mixed.tobytes(), SETTINGS)
    assert result.status == "partial" and result.requires_review
    assert result.pages[-1].method == "unreadable"
    assert "Eligibility" in result.pages[0].text
    assert result.pages[-1].start == result.pages[-1].end


@pytest.mark.parametrize("raw,expected,note", [("31 October 2026", "2026-10-31", None), ("2026-10-31", "2026-10-31", None), ("31/10/2026", "2026-10-31", None), ("01/02/2027", None, "Ambiguous"), ("31 February 2026", None, "validated")])
def test_dates_are_not_guessed(raw, expected, note):
    iso, reason = date_candidate(raw)
    assert iso == expected
    if note:
        assert note in reason


def test_invalid_encrypted_page_and_render_limits():
    for data, code in [(b"not pdf", "INVALID_PDF"), (b"%PDF-broken", "PDF_UNREADABLE")]:
        with pytest.raises(ParseError) as caught:
            extract_pdf(data, SETTINGS)
        assert caught.value.code == code
    with pytest.raises(ParseError, match="page budget"):
        extract_pdf(digital_pdf(), Settings(max_pages=1))
    with pymupdf.open(stream=digital_pdf(), filetype="pdf") as source:
        encrypted = source.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, owner_pw="owner", user_pw="secret")
    with pytest.raises(ParseError) as caught:
        extract_pdf(encrypted, SETTINGS)
    assert caught.value.code == "PDF_ENCRYPTED"
    with pytest.raises(ParseError) as caught:
        extract_pdf(scanned_pdf(digital_pdf()), Settings(max_render_pixels=100000))
    assert caught.value.code == "NO_EXTRACTABLE_TEXT"


def test_rotation_and_merged_header_geometry():
    with pymupdf.open(stream=digital_pdf(), filetype="pdf") as source:
        source[0].set_rotation(90)
        result = extract_pdf(source.tobytes(), SETTINGS)
    page = result.pages[0]
    assert page.original_rotation == 90 and page.width == 842
    assert all(0 <= word.bbox[0] < word.bbox[2] <= page.width + 1 and 0 <= word.bbox[1] < word.bbox[3] <= page.height + 1 for word in page.words)
    stream = io.BytesIO()
    pdf = canvas.Canvas(stream)
    table = Table([["Quota Allocation", "", ""], ["Category", "Marks", "Seats"], ["General", "75%", "20"], ["SC", "65%", "10"]], colWidths=140, rowHeights=30)
    table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 1, "black"), ("SPAN", (0, 0), (-1, 0))]))
    table.wrapOn(pdf, 420, 120)
    table.drawOn(pdf, 50, 500)
    pdf.save()
    result = extract_pdf(stream.getvalue(), SETTINGS)
    assert any(cell.column_span == 3 and "Quota" in cell.text for table in result.tables for cell in table.cells)


def test_response_round_trip_preserves_evidence_and_geometry():
    result = extract_pdf(digital_pdf(), SETTINGS)
    restored = Extraction.model_validate_json(result.model_dump_json())
    assert restored == result


def test_utf16_offsets_after_non_bmp_text_are_exact():
    first = "Public circular 📚"
    second = "Deadline: 31 October 2026"
    text = first + "\n" + second
    boundary = utf16_length(first) + 1
    lines = [{"text": first, "bbox": [10, 10, 220, 22], "start": 0, "end": boundary - 1, "font_size": 12, "bold": False},
             {"text": second, "bbox": [10, 30, 300, 42], "start": boundary, "end": utf16_length(text), "font_size": 12, "bold": False}]
    pages = [{"number": 1, "method": "digital", "start": 0, "end": utf16_length(text), "lines": lines}]
    _, metadata = analyse(text, pages, [])
    hit = metadata["deadline_dates"][0]
    assert hit["start"] == len(first) + 2
    assert hit["quote"] == second
    assert text.encode("utf-16-le")[hit["start"] * 2:hit["end"] * 2].decode("utf-16-le") == second


def test_thirty_page_circular_preserves_every_page_and_table():
    with pymupdf.open(stream=digital_pdf(), filetype="pdf") as source, pymupdf.open() as document:
        for _ in range(15):
            document.insert_pdf(source)
        result = extract_pdf(document.tobytes(), SETTINGS)
    assert len(result.pages) == 30
    assert len([table for table in result.tables if table.method == "pdfplumber_lines"]) == 15
    assert result.pages[-1].end == utf16_length(result.text)


def test_unruled_digital_table_has_explicitly_inferred_geometry():
    stream = io.BytesIO()
    pdf = canvas.Canvas(stream)
    pdf.setFont("Helvetica", 12)
    for row, values in enumerate([["Category", "Minimum marks", "Income ceiling"], ["General", "75%", "Rs. 250000"], ["SC", "65%", "Rs. 300000"], ["OBC", "70%", "Rs. 280000"]]):
        for x, value in zip([45, 225, 400], values):
            pdf.drawString(x, 740 - row * 30, value)
    pdf.save()
    result = extract_pdf(stream.getvalue(), SETTINGS)
    table = next(table for table in result.tables if table.method == "pdfplumber_text")
    assert table.row_count == 4
    assert table.rows[1] == ["General", "75%", "Rs. 250000"]
    assert table.requires_review


def test_cropped_page_table_coordinates_match_the_visible_page():
    with pymupdf.open(stream=digital_pdf(), filetype="pdf") as source:
        source[0].set_cropbox(pymupdf.Rect(20, 30, 575, 820))
        result = extract_pdf(source.tobytes(), SETTINGS)
    page = result.pages[0]
    table = next(table for table in result.tables if table.method == "pdfplumber_lines")
    assert page.width == 555 and page.height == 790
    assert table.bbox[0] == 18
    assert table.rows[1] == ["General", "75%", "Rs. 250000"]
    for cell in table.cells:
        for index in cell.word_indices:
            word = page.words[index]
            assert cell.bbox[0] <= (word.bbox[0] + word.bbox[2]) / 2 <= cell.bbox[2]
