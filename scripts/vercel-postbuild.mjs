import { cp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const distClient = path.join(root, "dist/client");
const distServer = path.join(root, "dist/server");
const outDir = path.join(root, ".vercel/output");
const staticDir = path.join(outDir, "static");
const fnDir = path.join(outDir, "functions/_ssr.func");

if (!existsSync(distClient) || !existsSync(distServer)) {
  console.error("[vercel-postbuild] dist/client or dist/server missing — did the vite build run?");
  process.exit(1);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });
await mkdir(fnDir, { recursive: true });

// Static assets
await cp(distClient, staticDir, { recursive: true });

// Server bundle — copy whole dist/server into the function folder
await cp(distServer, fnDir, { recursive: true });

// Entry shim: Node serverless function that adapts Node req/res to Web Request/Response
const entry = `import server from "./server.js";
import { Readable } from "node:stream";

function toWebRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = new URL(req.url, \`\${protocol}://\${host}\`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv));
    else if (v != null) headers.set(k, String(v));
  }
  const method = req.method || "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? Readable.toWeb(req) : undefined;
  return new Request(url, { method, headers, body, duplex: "half" });
}

export default async function handler(req, res) {
  try {
    const webReq = toWebRequest(req);
    const webRes = await server.fetch(webReq, process.env, {});
    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => res.setHeader(key, value));
    if (webRes.body) {
      const nodeStream = Readable.fromWeb(webRes.body);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error("[ssr] handler error", err);
    res.statusCode = 500;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end("<h1>500</h1><p>Server error</p>");
  }
}
`;
await writeFile(path.join(fnDir, "index.mjs"), entry);

// Vercel function config
await writeFile(
  path.join(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
);

// package.json so the function dir is treated as ESM
await writeFile(
  path.join(fnDir, "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
);

// Top-level Vercel Build Output config
await writeFile(
  path.join(outDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/_ssr" },
      ],
    },
    null,
    2,
  ),
);

console.log("[vercel-postbuild] wrote .vercel/output");