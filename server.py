from __future__ import annotations

import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
SCRIPT_PATH = ROOT / 'scripts' / 'generate_history.py'


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            self._send_json({"ok": True})
            return
        self._send_json({"ok": False, "message": "Not found."}, status=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/api/generate-snapshot':
            self._send_json({"ok": False, "message": "Not found."}, status=404)
            return

        if not self._is_local_request():
            self._send_json(
                {
                    'ok': False,
                    'message': 'Snapshot generation is only allowed from localhost.',
                },
                status=403,
            )
            return

        try:
            length = int(self.headers.get('Content-Length', '0'))
            body = self.rfile.read(length).decode('utf-8') if length else '{}'
            payload = json.loads(body) if body.strip() else {}
            result = subprocess.run(
                [sys.executable, str(SCRIPT_PATH)],
                cwd=str(ROOT),
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                self._send_json(
                    {
                        'ok': False,
                        'message': 'Snapshot generation failed.',
                        'error': result.stderr.strip() or result.stdout.strip(),
                    },
                    status=500,
                )
                return

            self._send_json(
                {
                    'ok': True,
                    'message': 'Snapshot generated successfully.',
                    'payload': payload,
                    'stdout': result.stdout.strip(),
                }
            )
        except Exception as exc:  # noqa: BLE001
            self._send_json(
                {
                    'ok': False,
                    'message': 'Snapshot generation failed.',
                    'error': str(exc),
                },
                status=500,
            )

    def _is_local_request(self):
        host_header = self.headers.get('Host', '')
        host_name = host_header.split(':')[0]
        client_ip = self.client_address[0]
        return host_name in ('localhost', '127.0.0.1', '::1') or client_ip in ('127.0.0.1', '::1')

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '3000'))
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    print(f'Server running on http://localhost:{port}')
    server.serve_forever()
