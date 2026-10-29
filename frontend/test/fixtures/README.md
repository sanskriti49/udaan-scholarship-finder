`hindi-english-income.png` is a synthetic certificate image rendered locally for
real OCR regressions. All names and details are fictional. The fixed raster
keeps Hindi shaping identical on Windows and Linux without depending on a test
machine's installed fonts. It exercises Hindi labels and names, Devanagari dates
and currency, parent-name exclusion, mixed English/Hindi recognition, and a PDF
page-image fallback with an incomplete embedded text layer.

The hybrid PDF test embeds these pixels with lossless Flate compression. It
must not re-encode this image as JPEG: that made the expected Devanagari income
read differently on Ubuntu/Chromium and Windows/Edge. The separate scanned-PDF
and JPEG test retains real lossy-image OCR coverage. All exact field assertions
and worker-cleanup checks remain enabled.
