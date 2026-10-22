"""Synthetic circulars only; no captured official policies or personal files."""
import io
from pathlib import Path
import pymupdf
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle


def digital_pdf():
    stream = io.BytesIO()
    pdf = canvas.Canvas(stream, pagesize=(595, 842), invariant=1)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(38, 810, "SYNTHETIC TEST FIXTURE - NOT AN OFFICIAL CIRCULAR")
    pdf.setFont("Helvetica-Bold", 15)
    pdf.drawString(38, 776, "Department of Higher Education, Government of Testing")
    pdf.setFont("Helvetica", 11)
    pdf.drawString(38, 751, "Circular No. EDU/2026/42")
    pdf.drawString(38, 733, "Guidelines for the Example Student Scholarship")
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(38, 696, "1. Eligibility")
    pdf.setFont("Helvetica", 11)
    pdf.drawString(38, 675, "Applicants must study in a recognised institution. Category limits differ below.")
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(38, 646, "1.1 Academic and income requirements")
    data = [["Category", "Minimum marks", "Annual income ceiling"], ["General", "75%", "Rs. 250000"], ["SC / ST", "65%", "Rs. 300000"], ["OBC", "70%", "Rs. 280000"]]
    table = Table(data, colWidths=[140, 160, 218], rowHeights=32)
    table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 1, colors.black), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e8d5")), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 12), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    table.wrapOn(pdf, 518, 128)
    table.drawOn(pdf, 38, 496)
    for y, heading, content in [
        (457, "2. Benefits", "The selected students receive Rs. 24000 per year, subject to verification."),
        (386, "3. Document Checklist", "Submit a marksheet, income certificate and proof of current admission."),
        (315, "4. Important Dates", "The last date for student applications is 31 October 2026."),
    ]:
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(38, y, heading)
        pdf.setFont("Helvetica", 11)
        pdf.drawString(38, y - 23, content)
    pdf.drawString(38, 266, "Institute verification deadline: 01/02/2027 (date order is not specified).")
    pdf.setStrokeColor(colors.HexColor("#a95353"))
    pdf.circle(492, 161, 35, stroke=1, fill=0)
    pdf.setFillColor(colors.HexColor("#a95353"))
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawCentredString(492, 165, "TEST")
    pdf.drawCentredString(492, 148, "STAMP")
    pdf.setFillColor(colors.black)
    pdf.showPage()
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(38, 785, "5. General Conditions")
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(38, 745, "5.1 Selection")
    pdf.drawString(320, 745, "5.2 Review")
    pdf.setFont("Helvetica", 11)
    for i, text in enumerate(["LEFT COLUMN START", "Selection is based on the stated criteria.", "No award is guaranteed by this notice.", "Applicants should keep their records.", "LEFT COLUMN END"]):
        pdf.drawString(38, 721 - i * 18, text)
    for i, text in enumerate(["RIGHT COLUMN START", "The issuing office reviews all documents.", "Applicants may request clarification.", "Retain the application acknowledgement.", "RIGHT COLUMN END"]):
        pdf.drawString(320, 721 - i * 18, text)
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(38, 550, "Annexure A - Document format")
    pdf.setFont("Helvetica", 11)
    pdf.drawString(38, 526, "Use the format specified by the provider. This example is only a test document.")
    pdf.save()
    return stream.getvalue()


def scanned_pdf(data):
    stream = io.BytesIO()
    pdf = canvas.Canvas(stream, pagesize=(595, 842), invariant=1)
    with pymupdf.open(stream=data, filetype="pdf") as source:
        page = source[0]
        pix = page.get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), alpha=False)
        pdf.drawImage(ImageReader(io.BytesIO(pix.tobytes("png"))), 0, 0, width=595, height=842)
    pdf.save()
    return stream.getvalue()


def write_fixtures(folder):
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    digital = digital_pdf()
    scan = scanned_pdf(digital)
    (folder / "layout.pdf").write_bytes(digital)
    (folder / "scanned.pdf").write_bytes(scan)
    with pymupdf.open(stream=digital, filetype="pdf") as mixed, pymupdf.open(stream=scan, filetype="pdf") as scanned:
        mixed.insert_pdf(scanned)
        mixed.save(folder / "mixed.pdf")


if __name__ == "__main__":
    import sys
    write_fixtures(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent / "fixtures")
