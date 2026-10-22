import asyncio
from contextlib import suppress
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import sys
from tempfile import TemporaryDirectory
import psutil
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from . import CONTRACT_VERSION, EXTRACTOR_VERSION
from .config import Settings
from .models import Extraction


async def stop_worker(process):
    if process.returncode is not None:
        return
    # Kill only this job's descendants, including Tesseract on Windows and Linux.
    with suppress(psutil.NoSuchProcess):
        for child in psutil.Process(process.pid).children(recursive=True):
            with suppress(psutil.NoSuchProcess):
                child.kill()
    with suppress(ProcessLookupError):
        process.kill()
    await process.wait()


async def run_worker(data, settings, languages):
    with TemporaryDirectory(prefix="udaan-gazette-") as folder:
        source, output = Path(folder) / "source.pdf", Path(folder) / "result.json"
        await asyncio.to_thread(source.write_bytes, data)
        worker_env = os.environ.copy()
        worker_env.pop("GAZETTE_API_KEY", None)
        worker_env.update({"OMP_THREAD_LIMIT": "1", "OPENBLAS_NUM_THREADS": "1", "MKL_NUM_THREADS": "1", "NUMEXPR_NUM_THREADS": "1", "TMPDIR": folder, "TEMP": folder, "TMP": folder})
        process = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "gazette.worker", str(source), str(output),
            settings.model_dump_json(exclude={"api_key"}), languages,
            cwd=Path(__file__).resolve().parents[1], stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
            # Keep pytesseract's own temporary images/TSV files inside this job
            # too, so a killed native process cannot leave files in global /tmp.
            env=worker_env,
        )
        try:
            await asyncio.wait_for(process.wait(), timeout=settings.job_timeout_seconds)
            if process.returncode or not output.exists():
                raise HTTPException(502, detail={"code": "WORKER_FAILED", "message": "The parsing process did not return a result."})
            if output.stat().st_size > settings.max_result_bytes + 2048:
                raise HTTPException(422, detail={"code": "RESULT_LIMIT", "message": "The response exceeded its size budget."})
            payload = json.loads(await asyncio.to_thread(output.read_text, encoding="utf-8"))
            if not payload["ok"]:
                raise HTTPException(payload["status"], detail={"code": payload["code"], "message": payload["message"]})
            return Extraction.model_validate(payload["data"])
        except TimeoutError:
            raise HTTPException(504, detail={"code": "JOB_TIMEOUT", "message": "The document time budget was exceeded."}) from None
        except (ValueError, KeyError, TypeError):
            raise HTTPException(502, detail={"code": "WORKER_CONTRACT_INVALID", "message": "The parsing process returned an invalid result."}) from None
        finally:
            await stop_worker(process)


def create_app(settings=None, runner=run_worker):
    settings = settings or Settings.from_env()
    app = FastAPI(title="Udaan Official Gazette Document Intelligence", version=EXTRACTOR_VERSION)
    slots = asyncio.Semaphore(settings.max_workers)

    @app.get("/healthz")
    async def health():
        return {"status": "ok", "contract_version": CONTRACT_VERSION, "extractor_version": EXTRACTOR_VERSION}

    @app.get("/readyz")
    async def ready():
        try:
            process = await asyncio.create_subprocess_exec("tesseract", "--list-langs", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
            try:
                output, _ = await asyncio.wait_for(process.communicate(), 3)
            finally:
                await stop_worker(process)
            languages = output.decode().splitlines()[1:]
            available = process.returncode == 0 and all(lang in languages for lang in settings.ocr_languages.split("+"))
        except (OSError, TimeoutError):
            languages, available = [], False
        return JSONResponse(status_code=200 if available else 503, content={"status": "ready" if available else "ocr_unavailable", "available_ocr_languages": languages, "default_ocr_languages": settings.ocr_languages})

    @app.post("/v1/extract", response_model=Extraction, openapi_extra={"requestBody": {"required": True, "content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}}})
    async def extract(request: Request, ocr_languages: str | None = None):
        if settings.api_key and not hmac.compare_digest(request.headers.get("x-gazette-key", "").encode(), settings.api_key.encode()):
            raise HTTPException(401, detail={"code": "UNAUTHORIZED", "message": "An internal service key is required."})
        if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/pdf":
            raise HTTPException(415, detail={"code": "CONTENT_TYPE", "message": "Send PDF bytes with Content-Type: application/pdf."})
        languages = ocr_languages or settings.ocr_languages
        if not re.fullmatch(r"[a-z]{3}(?:\+[a-z]{3}){0,7}", languages):
            raise HTTPException(422, detail={"code": "INVALID_OCR_LANGUAGES", "message": "Invalid OCR language codes."})
        declared = request.headers.get("content-length")
        if declared and (not declared.isdigit() or int(declared) > settings.max_upload_bytes):
            raise HTTPException(413, detail={"code": "UPLOAD_LIMIT", "message": "The upload exceeds its byte budget."})
        if slots.locked():
            raise HTTPException(503, detail={"code": "BUSY", "message": "All document workers are busy."}, headers={"Retry-After": "15"})
        await slots.acquire()
        try:
            chunks, size = [], 0
            try:
                async with asyncio.timeout(settings.upload_timeout_seconds):
                    async for chunk in request.stream():
                        size += len(chunk)
                        if size > settings.max_upload_bytes:
                            raise HTTPException(413, detail={"code": "UPLOAD_LIMIT", "message": "The upload exceeds its byte budget."})
                        chunks.append(chunk)
            except TimeoutError:
                raise HTTPException(408, detail={"code": "UPLOAD_TIMEOUT", "message": "The upload time budget was exceeded."}) from None
            data = b"".join(chunks)
            if not data.startswith(b"%PDF-"):
                raise HTTPException(422, detail={"code": "INVALID_PDF", "message": "The body is not a PDF."})
            expected = request.headers.get("x-document-sha256")
            if expected and (not re.fullmatch(r"[a-f0-9]{64}", expected) or not hmac.compare_digest(expected, hashlib.sha256(data).hexdigest())):
                raise HTTPException(400, detail={"code": "HASH_MISMATCH", "message": "The uploaded bytes do not match the declared digest."})

            monitor_stopped = asyncio.Event()
            async def disconnect():
                while not monitor_stopped.is_set():
                    if await request.is_disconnected():
                        return
                    await asyncio.sleep(.2)

            job = asyncio.create_task(runner(data, settings, languages))
            closed = asyncio.create_task(disconnect())
            try:
                completed, _ = await asyncio.wait([job, closed], return_when=asyncio.FIRST_COMPLETED)
                if closed in completed and not job.done():
                    raise HTTPException(499, detail={"code": "CLIENT_DISCONNECTED", "message": "The caller disconnected."})
                return await job
            finally:
                # is_disconnected() uses an AnyIO cancellation scope. A stop
                # flag also ends the loop if that scope consumes cancellation.
                monitor_stopped.set()
                closed.cancel()
                job.cancel()
                with suppress(asyncio.CancelledError):
                    await closed
                with suppress(asyncio.CancelledError):
                    await job
        finally:
            slots.release()

    return app


app = create_app()
