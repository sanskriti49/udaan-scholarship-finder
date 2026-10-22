import asyncio
import hashlib
from pathlib import Path
import tempfile
import httpx
from gazette.app import create_app
from gazette.config import Settings
from .fixture_factory import digital_pdf, scanned_pdf


def test_real_subprocess_contract_auth_invalid_files_and_limits():
    async def scenario():
        settings = Settings(api_key="synthetic-internal-key", ocr_languages="eng")
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=create_app(settings)), base_url="http://gazette") as client:
            assert (await client.get("/healthz")).status_code == 200
            assert (await client.get("/readyz")).status_code == 200
            assert (await client.post("/v1/extract", content=digital_pdf(), headers={"content-type": "application/pdf"})).status_code == 401
            headers = {"content-type": "application/pdf", "x-gazette-key": settings.api_key}
            wrong_type = await client.post("/v1/extract", content=b"bad", headers={**headers, "content-type": "text/plain"})
            assert wrong_type.status_code == 415
            assert (await client.post("/v1/extract", content=b"bad", headers=headers)).status_code == 422
            assert (await client.post("/v1/extract", content=b"%PDF-corrupt", headers=headers)).json()["detail"]["code"] == "PDF_UNREADABLE"
            assert (await client.post("/v1/extract", content=digital_pdf(), headers={**headers, "x-document-sha256": "0" * 64})).status_code == 400
            assert (await client.post("/v1/extract?ocr_languages=../../unsafe", content=digital_pdf(), headers=headers)).status_code == 422
            data = digital_pdf()
            response = await client.post("/v1/extract", content=data, headers={**headers, "x-document-sha256": hashlib.sha256(data).hexdigest()})
            assert response.status_code == 200, response.text
            assert response.json()["contract_version"] == "1.0"
            assert len(response.json()["tables"]) >= 1
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=create_app(Settings(max_upload_bytes=1024))), base_url="http://gazette") as client:
            response = await client.post("/v1/extract", content=digital_pdf(), headers={"content-type": "application/pdf"})
            assert response.status_code == 413
    asyncio.run(scenario())


def test_busy_workers_reject_excess_jobs_but_health_remains_responsive():
    from gazette.parser import extract_pdf
    recovered = extract_pdf(digital_pdf(), Settings(ocr_languages="eng"))
    async def scenario():
        started = asyncio.Event()
        calls = 0
        async def hold(*args):
            nonlocal calls
            calls += 1
            if calls == 1:
                started.set()
                await asyncio.sleep(20)
            return recovered
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=create_app(Settings(max_workers=1), runner=hold)), base_url="http://gazette") as client:
            headers = {"content-type": "application/pdf"}
            first = asyncio.create_task(client.post("/v1/extract", content=digital_pdf(), headers=headers))
            await asyncio.wait_for(started.wait(), 2)
            assert (await asyncio.wait_for(client.get("/healthz"), 1)).status_code == 200
            assert (await client.post("/v1/extract", content=digital_pdf(), headers=headers)).status_code == 503
            first.cancel()
            try:
                await first
            except asyncio.CancelledError:
                pass
            assert (await asyncio.wait_for(client.post("/v1/extract", content=digital_pdf(), headers=headers), 2)).status_code == 200
    asyncio.run(scenario())


def test_job_deadline_kills_worker_and_removes_temporary_files():
    async def scenario():
        before = set(Path(tempfile.gettempdir()).glob("udaan-gazette-*"))
        app = create_app(Settings(job_timeout_seconds=.01))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://gazette") as client:
            response = await client.post("/v1/extract", content=digital_pdf(), headers={"content-type": "application/pdf"})
            assert response.status_code == 504
            assert response.json()["detail"]["code"] == "JOB_TIMEOUT"
            assert (await client.get("/healthz")).status_code == 200
        assert set(Path(tempfile.gettempdir()).glob("udaan-gazette-*")) == before
    asyncio.run(scenario())


def test_actual_ocr_job_does_not_block_health_requests():
    async def scenario():
        app = create_app(Settings(ocr_languages="eng"))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://gazette") as client:
            job = asyncio.create_task(client.post("/v1/extract", content=scanned_pdf(digital_pdf()), headers={"content-type": "application/pdf"}))
            await asyncio.sleep(.05)
            assert (await asyncio.wait_for(client.get("/healthz"), 1)).status_code == 200
            result = await job
            assert result.status_code == 200, result.text
            assert result.json()["pages"][0]["method"] == "ocr"
    asyncio.run(scenario())
