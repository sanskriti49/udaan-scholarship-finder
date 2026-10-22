"""One disposable parsing process per admitted document, never an ASGI thread."""
import json
from pathlib import Path
import sys
from .config import Settings
from .models import ParseError
from .parser import extract_pdf


def main():
    source, output, settings_json, languages = sys.argv[1:]
    try:
        result = extract_pdf(Path(source).read_bytes(), Settings(**json.loads(settings_json)), languages)
        payload = {"ok": True, "data": result.model_dump()}
    except ParseError as error:
        payload = {"ok": False, "code": error.code, "message": error.message, "status": error.status}
    except Exception:
        # PDF strings, local filenames, and native-library diagnostics stay private.
        payload = {"ok": False, "code": "PARSER_FAILED", "message": "The parsing worker could not process this document.", "status": 500}
    Path(output).write_text(json.dumps(payload, ensure_ascii=False, allow_nan=False), encoding="utf-8")


if __name__ == "__main__":
    main()
