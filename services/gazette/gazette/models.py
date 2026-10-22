from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Box = tuple[float, float, float, float]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Word(Model):
    index: int = Field(ge=0)
    text: str
    bbox: Box
    confidence: float | None = Field(default=None, ge=0, le=100)


class Line(Model):
    text: str
    bbox: Box
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    font_size: float = 0
    bold: bool = False


class Page(Model):
    number: int = Field(ge=1)
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    original_rotation: int
    method: Literal["digital", "ocr", "unreadable", "blank"]
    text: str
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    words: list[Word] = Field(max_length=12000)
    lines: list[Line] = Field(max_length=12000)


class Cell(Model):
    row: int = Field(ge=0)
    column: int = Field(ge=0)
    row_span: int = Field(ge=1)
    column_span: int = Field(ge=1)
    text: str
    bbox: Box
    word_indices: list[int] = Field(max_length=12000)


class Table(Model):
    id: str
    page: int = Field(ge=1)
    method: Literal["pdfplumber_lines", "pdfplumber_text", "ocr_grid"]
    bbox: Box
    row_count: int = Field(ge=2)
    column_count: int = Field(ge=2)
    rows: list[list[str | None]]
    cells: list[Cell] = Field(max_length=2000)
    requires_review: Literal[True] = True


class Section(Model):
    id: str
    parent_id: str | None
    level: int = Field(ge=0, le=8)
    title: str
    kind: Literal["preamble", "eligibility", "benefits", "documents", "dates", "annexure", "other"]
    heading_text: str | None
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    page_start: int = Field(ge=1)
    page_end: int = Field(ge=1)
    text: str


class MetadataHit(Model):
    value: str
    quote: str
    page: int = Field(ge=1)
    bbox: Box
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    method: Literal["digital", "ocr"]
    requires_review: Literal[True] = True
    date_text: str | None = None
    iso_date: str | None = None
    date_note: str | None = None


class Metadata(Model):
    notification_numbers: list[MetadataHit] = Field(max_length=500)
    issuing_authorities: list[MetadataHit] = Field(max_length=500)
    deadline_dates: list[MetadataHit] = Field(max_length=500)


class Warning(Model):
    code: str
    page: int | None = None
    message: str


class Extraction(Model):
    contract_version: Literal["1.0"]
    extractor_version: str
    profile_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    source_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    byte_length: int = Field(gt=0)
    status: Literal["complete", "partial"]
    offset_unit: Literal["utf16"]
    coordinate_space: Literal["page_points_top_left"]
    ocr_languages: str
    requires_review: bool
    text: str = Field(max_length=1_000_000)
    pages: list[Page] = Field(min_length=1, max_length=200)
    tables: list[Table] = Field(max_length=4000)
    sections: list[Section] = Field(max_length=500)
    metadata: Metadata
    warnings: list[Warning] = Field(max_length=1000)


class ParseError(Exception):
    def __init__(self, code: str, message: str, status: int = 422):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status
