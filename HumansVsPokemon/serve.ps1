# Simple HTTP server for HumansVsPokemon
# Run: pwsh serve.ps1  (or powershell serve.ps1)
# Then open http://localhost:8080 in Chrome/Edge 113+

$port = 8080
$root = $PSScriptRoot
Write-Host "Serving $root on http://localhost:$port" -ForegroundColor Cyan
Write-Host "Open Chrome/Edge 113+ and navigate to http://localhost:$port" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

$mimeTypes = @{
  '.html' = 'text/html'
  '.js'   = 'application/javascript'
  '.wgsl' = 'text/plain'
  '.css'  = 'text/css'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.json' = 'application/json'
}

while ($listener.IsListening) {
  $ctx  = $listener.GetContext()
  $req  = $ctx.Request
  $resp = $ctx.Response

  $urlPath = $req.Url.AbsolutePath
  if ($urlPath -eq '/') { $urlPath = '/index.html' }
  $filePath = Join-Path $root ($urlPath.TrimStart('/').Replace('/', '\'))

  if (Test-Path $filePath -PathType Leaf) {
    $ext  = [System.IO.Path]::GetExtension($filePath)
    $mime = if ($mimeTypes[$ext]) { $mimeTypes[$ext] } else { 'application/octet-stream' }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $resp.ContentType   = $mime
    $resp.ContentLength64 = $bytes.Length
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $resp.StatusCode = 404
    $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
    $resp.OutputStream.Write($body, 0, $body.Length)
  }
  $resp.OutputStream.Close()
}
