import http from "http";

function testRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data.slice(0, 100),
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function run() {
  const testOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://[::1]:5173",
    "http://192.168.1.25:5173",
    "http://localhost:3000",
    "https://udaan-scholarships.vercel.app",
    "https://udaan-scholarship-finder-git-main.vercel.app",
  ];

  const endpointsToTest = [
    "/api/notifications/unread-count",
    "/api/bookmarks",
    "/api/scholarships?sort=deadline&limit=36",
  ];

  console.log("=== 1. Testing Preflight OPTIONS Across Endpoints & Origins ===");
  let passedOptions = 0;
  let totalOptions = 0;

  for (const endpoint of endpointsToTest) {
    for (const origin of testOrigins) {
      totalOptions++;
      try {
        const res = await testRequest({
          hostname: "localhost",
          port: 5000,
          path: endpoint,
          method: "OPTIONS",
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
          },
        });
        const allowOrigin = res.headers["access-control-allow-origin"];
        const allowCreds = res.headers["access-control-allow-credentials"];
        const isOk = res.statusCode === 204 && allowOrigin === origin && allowCreds === "true";
        if (isOk) {
          passedOptions++;
        } else {
          console.error(`FAIL: ${endpoint} for ${origin} -> status=${res.statusCode}, allowOrigin=${allowOrigin}, allowCreds=${allowCreds}`);
        }
      } catch (err) {
        console.error(`ERROR: ${endpoint} for ${origin} -> ${err.message}`);
      }
    }
  }
  console.log(`Preflight results: ${passedOptions}/${totalOptions} passed.\n`);

  console.log("=== 2. Testing CORS GET Requests ===");
  let passedGet = 0;
  let totalGet = 0;

  for (const origin of testOrigins.slice(0, 5)) {
    totalGet++;
    try {
      const res = await testRequest({
        hostname: "localhost",
        port: 5000,
        path: "/api/scholarships?sort=deadline&limit=1",
        method: "GET",
        headers: {
          Origin: origin,
          Accept: "application/json",
        },
      });
      const allowOrigin = res.headers["access-control-allow-origin"];
      const isOk = res.statusCode === 200 && allowOrigin === origin;
      if (isOk) {
        passedGet++;
      } else {
        console.error(`FAIL GET for ${origin} -> status=${res.statusCode}, allowOrigin=${allowOrigin}`);
      }
    } catch (err) {
      console.error(`ERROR GET for ${origin} -> ${err.message}`);
    }
  }
  console.log(`GET results: ${passedGet}/${totalGet} passed.\n`);

  if (passedOptions === totalOptions && passedGet === totalGet) {
    console.log("ALL CORS TESTS PASSED SUCCESSFULLY! 🎉");
  } else {
    process.exit(1);
  }
}

run();
