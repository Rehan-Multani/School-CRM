# Local release APK (no Expo/EAS cloud). Run from app/:  powershell -File scripts/build-release-local.ps1
# Builds in a short-path copy (see $build below) because of the Windows 260-char path limit.
# Output: android/app/build/outputs/apk/release/app-release.apk -> copied to dist-apk/school-crm-<version>.apk
$ErrorActionPreference = 'Stop'
$app = Split-Path -Parent $PSScriptRoot

# Windows' 260-character path limit breaks the native (CMake/ninja) build for deep
# node_modules paths. A drive alias (subst) does not work (tools resolve the real path
# and mix roots), so build in a real short-path copy and bring the APK back.
$build = 'C:\crm-build\app'
New-Item -ItemType Directory -Force $build | Out-Null
robocopy $app $build /MIR /NFL /NDL /NJH /NJS /NP /XD (Join-Path $app 'android') (Join-Path $app 'dist-apk') (Join-Path $app '.expo') | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }
Set-Location $build
try {

if (-not $env:JAVA_HOME) { $env:JAVA_HOME = (Get-ChildItem "$env:USERPROFILE\.jdks" -Directory | Where-Object Name -like 'jdk-17*' | Select-Object -First 1).FullName }
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }

# Production release: R8 on, real-phone CPUs only (app.config.js), production API.
$env:APP_RELEASE = '1'
$env:EXPO_PUBLIC_API_URL = 'https://schoolsarthiapp.com/api/v1'
$env:NODE_ENV = 'production'

if (-not (Test-Path 'keystore/keystore.properties')) { throw 'keystore/keystore.properties missing' }

npx expo prebuild --platform android --clean --no-install
if ($LASTEXITCODE) { throw 'prebuild failed' }

# Sign the release build with our keystore (prebuild signs release with the debug key).
$gradle = 'android/app/build.gradle'
$text = Get-Content $gradle -Raw
if ($text -notmatch 'keystore.properties') {
  $load = @"
def keystoreProps = new Properties()
def keystoreFile = new File(rootProject.projectDir, '../keystore/keystore.properties')
if (keystoreFile.exists()) { keystoreFile.withInputStream { keystoreProps.load(it) } }

"@
  $text = $text -replace '(?m)^android \{', ($load + 'android {')
  $signing = @"
        release {
            storeFile new File(rootProject.projectDir, '../keystore/' + new File(keystoreProps['storeFile']).name)
            storePassword keystoreProps['storePassword']
            keyAlias keystoreProps['keyAlias']
            keyPassword keystoreProps['keyPassword']
        }

"@
  $text = $text -replace '(?m)^(\s*)signingConfigs \{\r?\n', ('${1}signingConfigs {' + "`n" + $signing)
  # the release buildType must use it
  $text = [regex]::Replace($text, '(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug', '${1}signingConfig signingConfigs.release')
  Set-Content $gradle $text -NoNewline
}

Push-Location android
.\gradlew.bat assembleRelease --no-daemon
$code = $LASTEXITCODE
Pop-Location
if ($code) { throw 'gradle assembleRelease failed' }

$version = (Get-Content app.json -Raw | ConvertFrom-Json).expo.version
New-Item -ItemType Directory -Force "$app\dist-apk" | Out-Null
Copy-Item android/app/build/outputs/apk/release/app-release.apk "$app\dist-apk\school-crm-$version.apk" -Force
Write-Host "Built $app\dist-apk\school-crm-$version.apk"
} finally {
  Set-Location $env:USERPROFILE
}
