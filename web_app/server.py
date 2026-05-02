#!/usr/bin/env python3
"""Static file server with a single write endpoint for falcon_commit.json."""

import json
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer

COMMIT_PATH = os.path.join(os.path.dirname(__file__), 'data', 'falcon_commit.json')


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/save-falcon-commit':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                with open(COMMIT_PATH, 'w') as f:
                    json.dump(data, f, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, fmt, *args):
        # Suppress noisy GET logs; only show POST saves
        if self.command == 'POST':
            print(f'  [save] {self.path} — {args[1]}')


if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    os.chdir(os.path.dirname(__file__))
    print(f'  Serving on http://localhost:{port}')
    HTTPServer(('', port), Handler).serve_forever()
