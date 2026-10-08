"""Local dev server for Rock 'n' Roll Zombies. Run: python serve.py  then open http://localhost:8080
Sends no-cache headers so edits show up on refresh."""
import http.server
import os
import socketserver

PORT = 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("", PORT), NoCache) as httpd:
    print(f"Serving on http://localhost:{PORT}")
    httpd.serve_forever()
