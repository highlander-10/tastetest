import http.server
import socketserver

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    "": "text/html",
})

print(f"Starting server at http://localhost:{PORT}")
print("Open your browser and navigate to the URL above")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
