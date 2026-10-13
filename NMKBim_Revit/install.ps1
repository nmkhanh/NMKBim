# NMKBim Revit Add-in Installer Script
param(
    [string]$RevitVersion = "All"
)

$ErrorActionPreference = "Stop"

$currentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         CAI DAT NMKBIM REVIT ADD-IN CHO REVIT           " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Build project
Write-Host "`n[1/3] Dang bien dich NMKBim_Revit..." -ForegroundColor Green
dotnet build "$currentDir\NMKBim_Revit.csproj" -c Release

if ($LASTEXITCODE -ne 0) {
    Write-Host "[LOI] Bien dich that bai. Vui long kiem tra lai SDK .NET." -ForegroundColor Red
    exit 1
}

# 2. Xac dinh thu muc Revit Addins
$appData = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::ApplicationData)
$revitAddinsBase = Join-Path $appData "Autodesk\Revit\Addins"

if (-not (Test-Path $revitAddinsBase)) {
    New-Item -ItemType Directory -Path $revitAddinsBase -Force | Out-Null
}

$revitYears = @("2020", "2021", "2022", "2023", "2024", "2025", "2026", "2027")

Write-Host "`n[2/3] Dang copy file addin vao thu muc Revit..." -ForegroundColor Green

foreach ($year in $revitYears) {
    $targetDir = Join-Path $revitAddinsBase $year
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    $yearNum = [int]$year
    $sourceBinDir = ""
    if ($yearNum -le 2024) {
        $sourceBinDir = Join-Path $currentDir "bin\Release\net48"
        if (-not (Test-Path $sourceBinDir)) {
            $sourceBinDir = Join-Path $currentDir "bin\Debug\net48"
        }
    } else {
        $sourceBinDir = Join-Path $currentDir "bin\Release\net10.0-windows"
        if (-not (Test-Path $sourceBinDir)) {
            $sourceBinDir = Join-Path $currentDir "bin\Debug\net10.0-windows"
        }
    }

    $targetBundleDir = Join-Path $targetDir "NMKBim_Revit"
    if (-not (Test-Path $targetBundleDir)) {
        New-Item -ItemType Directory -Path $targetBundleDir -Force | Out-Null
    }

    # Copy DLLs & dependencies
    try {
        Copy-Item -Path "$sourceBinDir\*" -Destination $targetBundleDir -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "  (Canh bao: Mot so file dang duoc su dung boi Revit ${year})" -ForegroundColor DarkYellow
    }

    # Tao hoac cap nhat file .addin
    $targetAddinFile = Join-Path $targetDir "NMKBim_Revit.addin"
    $dllFullPath = Join-Path $targetBundleDir "NMKBim_Revit.dll"

    $manifestXml = @"
<?xml version="1.0" encoding="utf-8"?>
<RevitAddIns>
  <AddIn Type="Application">
    <Name>NMKBim_Revit</Name>
    <Assembly>$dllFullPath</Assembly>
    <FullClassName>NMKBim_Revit.App</FullClassName>
    <ClientId>A182F571-0857-4C3D-889E-758CEF40B345</ClientId>
    <VendorId>NMKBIM</VendorId>
    <VendorDescription>NMKBim High-Performance BIM Solutions</VendorDescription>
  </AddIn>
</RevitAddIns>
"@

    Set-Content -Path $targetAddinFile -Value $manifestXml -Encoding UTF8
    Write-Host "  -> Da cai dat cho Revit ${year}: $targetAddinFile" -ForegroundColor Cyan
}

Write-Host "`n[3/3] HOAN TAT! Khoi dong lai Autodesk Revit de su dung Ribbon Tab 'NMKBim'." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
