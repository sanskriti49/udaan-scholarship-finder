import os
from pydantic import BaseModel, Field


class Settings(BaseModel):
    max_upload_bytes: int = Field(default=20 * 1024 * 1024, ge=1024, le=50 * 1024 * 1024)
    max_pages: int = Field(default=60, ge=1, le=200)
    max_workers: int = Field(default=2, ge=1, le=8)
    job_timeout_seconds: float = Field(default=75, gt=0, le=300)
    upload_timeout_seconds: float = Field(default=15, gt=0, le=120)
    ocr_timeout_seconds: float = Field(default=12, gt=0, le=60)
    ocr_languages: str = "eng+hin"
    ocr_dpi: int = Field(default=180, ge=100, le=300)
    max_render_pixels: int = Field(default=12_000_000, ge=100_000, le=30_000_000)
    max_text_chars: int = Field(default=1_000_000, ge=100, le=1_000_000)
    max_result_bytes: int = Field(default=4 * 1024 * 1024, ge=1024, le=8 * 1024 * 1024)
    api_key: str = ""

    @classmethod
    def from_env(cls):
        values = {name: os.environ[f"GAZETTE_{name.upper()}"] for name in cls.model_fields if f"GAZETTE_{name.upper()}" in os.environ}
        return cls(**values)
