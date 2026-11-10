\xef\xbb\xbf<#
 CyberAdmin Security Center - instalador/preparador para Windows 10/11 (PowerShell 5.1+).
 Uso:  powershell -ExecutionPolicy Bypass -File install.ps1 [-NoBrowser] [-SkipZip]
 No modifica el sistema ni instala nada: valida el proyecto, crea el ZIP y guía la carga en Chrome/Edge.
 (Chrome y Edge no permiten instalar extensiones sin firmar de forma silenciosa; se carga sin empaquetar en modo desarrollador.)
#>
param([switch]$NoBrowser, [switch]$SkipZip)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
function Step($m) { Write-Host "`n== $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function Fail($m) { Write-Host "  [ERROR] $m" -ForegroundColor Red; exit 1 }

Step '1/4 Comprobando archivos obligatorios'
$required = 'manifest.json','popup.html','popup.js','popup.css','background\service-worker.js','dashboard\index.html','dashboard\app.js','dashboard\dashboard.css',
  'assets\icons\icon16.png','assets\icons\icon32.png','assets\icons\icon48.png','assets\icons\icon128.png','modules\phishing\analyzer.js','modules\incidents\incidents.js',
  'modules\playbooks\playbooks.js','modules\alerts\alerts.js','modules\audit\audit.js','modules\reports\reports.js','storage\db.js','README.md','INSTALL.md'
foreach ($f in $required) { if (-not (Test-Path (Join-Path $root $f))) { Fail "Falta $f" } }
Ok "$($required.Count) archivos presentes"

Step '2/4 Validando manifest.json'
try { $m = Get-Content (Join-Path $root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json } catch { Fail "manifest.json no es JSON valido: $($_.Exception.Message)" }
if ($m.manifest_version -ne 3) { Fail 'manifest_version debe ser 3' }
$allowed = 'storage','alarms','notifications','contextMenus'
foreach ($p in $m.permissions) { if ($allowed -notcontains $p) { Fail "Permiso no permitido: $p" } }
$refs = @($m.background.service_worker, $m.action.default_popup) + @($m.icons.PSObject.Properties.Value)
foreach ($r in $refs) { if (-not (Test-Path (Join-Path $root $r))) { Fail "El manifest referencia un archivo inexistente: $r" } }
Ok "Manifest V3 valido: $($m.name) v$($m.version); permisos: $($m.permissions -join ', ')"

Step '3/4 Validacion avanzada (si Node.js esta disponible)'
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  & node scripts\check-deps.mjs; if ($LASTEXITCODE -ne 0) { Fail 'Dependencias incompletas' }
  & node scripts\validate.mjs;   if ($LASTEXITCODE -ne 0) { Fail 'Validacion fallida' }
  & node scripts\run-tests.mjs;  if ($LASTEXITCODE -ne 0) { Fail 'Tests fallidos' }
  Ok 'Sintaxis, rutas, seguridad estatica y tests correctos'
} else { Write-Host '  [AVISO] Node.js no encontrado: se omiten sintaxis/tests (la extension funciona igual). Instala Node 18+ para la validacion completa.' -ForegroundColor Yellow }

if (-not $SkipZip) {
  Step '4/4 Creando ZIP'
  $dist = Join-Path $root 'dist'; $stage = Join-Path $dist 'CyberAdmin'
  if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
  New-Item -ItemType Directory -Path $stage | Out-Null
  foreach ($i in 'manifest.json','package.json','popup.html','popup.css','popup.js','background','dashboard','modules','services','storage','utils','assets','config','docs','scripts','tests','backend','README.md','INSTALL.md','CHANGELOG.md','install.ps1','install.bat') {
    if (Test-Path (Join-Path $root $i)) { Copy-Item (Join-Path $root $i) $stage -Recurse -Force }
  }
  $zip = Join-Path $dist "CyberAdmin-v$($m.version).zip"
  Compress-Archive -Path $stage -DestinationPath $zip -Force
  Ok "ZIP: $zip"
}

Write-Host "`nPROYECTO LISTO. Para instalar:" -ForegroundColor Green
Write-Host "  Chrome: chrome://extensions -> Modo desarrollador -> Cargar descomprimida -> $root"
Write-Host "  Edge:   edge://extensions   -> Modo desarrollador -> Cargar descomprimida -> $root"
if (-not $NoBrowser) {
  $chrome = Get-Command chrome -ErrorAction SilentlyContinue; $edge = Get-Command msedge -ErrorAction SilentlyContinue
  if ($edge) { Start-Process msedge 'edge://extensions' } elseif ($chrome) { Start-Process chrome 'chrome://extensions' }
}
