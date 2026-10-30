"use strict";

/* Blackspire server: serves the website and saves every "Build with us"
   enquiry into an Excel file  ->  data/enquiries.xlsx

   Run:   npm install   (first time only)
          npm start     then open http://localhost:3000
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const XLSX_FILE = path.join(DATA_DIR, "enquiries.xlsx");
const MAX_BODY = 20 * 1024; // 20 KB is plenty for this form

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon",
};
// Never serve these (server code, data folder, dependencies)
const BLOCKED = /^\/(server\.js|package(-lock)?\.json|data|node_modules)(\/|$)/i;

const COLUMNS = [
  { header: "Submitted at", key: "submitted", width: 22 },
  { header: "Name", key: "name", width: 26 },
  { header: "Email", key: "email", width: 32 },
  { header: "Topic", key: "topic", width: 22 },
  { header: "Venture (if any)", key: "venture", width: 26 },
  { header: "Message", key: "message", width: 70 },
];
const TOPICS = ["Founder / Origin", "Business enquiry", "Partnership", "Careers / Internship", "General question"];

/* Stop Excel running text like =HYPERLINK(...) typed by a visitor */
function safeCell(value, max) {
  let v = String(value == null ? "" : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return v;
}

/* Writes happen one at a time so two visitors can't corrupt the file */
let queue = Promise.resolve();
function appendRow(row) {
  queue = queue.then(async () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const wb = new ExcelJS.Workbook();
    let ws;
    if (fs.existsSync(XLSX_FILE)) {
      await wb.xlsx.readFile(XLSX_FILE);
      ws = wb.getWorksheet("Enquiries");
    }
    if (!ws) {
      ws = wb.addWorksheet("Enquiries", { views: [{ state: "frozen", ySplit: 1 }] });
      ws.columns = COLUMNS;
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
    } else {
      ws.columns = COLUMNS;
    }
    ws.addRow(row).getCell("message").alignment = { wrapText: true, vertical: "top" };
    const tmp = XLSX_FILE + ".tmp";
    await wb.xlsx.writeFile(tmp);
    fs.renameSync(tmp, XLSX_FILE);
  });
  return queue;
}

function sendJSON(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

function handleEnquiry(req, res) {
  let size = 0;
  const chunks = [];
  req.on("data", (c) => {
    size += c.length;
    if (size > MAX_BODY) { sendJSON(res, 413, { ok: false, error: "Message too large." }); req.destroy(); return; }
    chunks.push(c);
  });
  req.on("end", async () => {
    let b;
    try { b = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return sendJSON(res, 400, { ok: false, error: "Invalid request." }); }
    if (b.website) return sendJSON(res, 200, { ok: true }); // spam trap: pretend success, save nothing

    const name = String(b.name || "").trim();
    const email = String(b.email || "").trim();
    const topic = String(b.topic || "").trim();
    const message = String(b.message || "").trim();
    if (!name || name.length > 80) return sendJSON(res, 400, { ok: false, error: "Please enter your name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return sendJSON(res, 400, { ok: false, error: "Please enter a valid email." });
    if (!TOPICS.includes(topic)) return sendJSON(res, 400, { ok: false, error: "Please choose a topic." });
    if (!message || message.length > 1200) return sendJSON(res, 400, { ok: false, error: "Please enter a message (max 1200 characters)." });

    try {
      await appendRow({
        submitted: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }),
        name: safeCell(name, 80), email: safeCell(email, 120), topic: safeCell(topic, 40),
        venture: safeCell(b.venture_id, 80), message: safeCell(message, 1200),
      });
      sendJSON(res, 200, { ok: true });
    } catch (err) {
      console.error("Could not write Excel file:", err.message);
      sendJSON(res, 500, { ok: false, error: "Could not save right now. Is enquiries.xlsx open in Excel? Close it and try again." });
    }
  });
}

function serveStatic(req, res) {
  let p;
  try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end("Bad request"); }
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + path.sep) || BLOCKED.test(p) || /(^|\/)\./.test(p)) { res.writeHead(404); return res.end("Not found"); }
  fs.readFile(file, (err, data) => {
    if (err) {
      return fs.readFile(path.join(ROOT, "404.html"), (e2, d2) => {
        res.writeHead(404, { "Content-Type": TYPES[".html"] });
        res.end(e2 ? "Not found" : d2);
      });
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
}

http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/api/enquiry") {
    if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); return res.end(); }
    return handleEnquiry(req, res);
  }
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  serveStatic(req, res);
}).listen(PORT, () => console.log("Blackspire running at http://localhost:" + PORT + "\nEnquiries are saved to data/enquiries.xlsx"));
