$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutClasses = Join-Path $ScriptDir "out"
$DistDir = Join-Path $ScriptDir "dist"
$JarPath = Join-Path $DistDir "first-studio-bridge.jar"

$JdkCandidates = @(
  "$env:PUBLIC\wpilib\2026\jdk\bin",
  "C:\Users\Public\wpilib\2026\jdk\bin",
  "$env:USERPROFILE\wpilib\2026\jdk\bin"
)

$Javac = $null
$Jar = $null
foreach ($bin in $JdkCandidates) {
  if (Test-Path (Join-Path $bin "javac.exe")) {
    $Javac = Join-Path $bin "javac.exe"
    $Jar = Join-Path $bin "jar.exe"
    break
  }
}
if (-not $Javac) {
  $Javac = (Get-Command javac -ErrorAction Stop).Source
  $Jar = (Get-Command jar -ErrorAction Stop).Source
}

if (Test-Path $OutClasses) { Remove-Item -Recurse -Force $OutClasses }
New-Item -ItemType Directory -Path $OutClasses | Out-Null
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

& $Javac --release 17 -d $OutClasses (Join-Path $ScriptDir "src\org\firststudio\bridge\FirstStudioBridge.java")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $Jar --create --file $JarPath --main-class org.firststudio.bridge.FirstStudioBridge -C $OutClasses .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Built $JarPath successfully."
