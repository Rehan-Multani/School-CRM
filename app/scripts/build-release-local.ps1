# Local release APK (no Expo/EAS cloud). Run from app/:  powershell -File scripts/build-release-local.ps1
# Builds in a short-path copy (see $build below) because of the Windows 260-char path limit.
# Output: android/app/build/outputs/apk/release/app-release.apk -> copied to dist-apk/school-crm-<version>.apk
# Optional: build an APK that talks to another backend (e.g. your PC on the LAN):
#   powershell -File scripts/build-release-local.ps1 -ApiUrl http://192.168.1.24:5000/api/v1
# Such a build is written ONLY to dist-apk/school-crm-<version>-local.apk and never
# overwrites the production APK in apk/. Plain http:// is allowed for it automatically.
param([string]$ApiUrl = '')

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
$prodUrl = 'https://schoolsarthiapp.com/api/v1'
$apiUrl = if ($ApiUrl) { $ApiUrl.Trim().TrimEnd('/') } else { $prodUrl }
$isProd = ($apiUrl -eq $prodUrl)
$env:EXPO_PUBLIC_API_URL = $apiUrl
# A release build blocks plain http:// - a LAN backend needs cleartext allowed.
if ($apiUrl -like 'http://*') { $env:ALLOW_HTTP = '1' }
Write-Host "API URL baked into this build: $apiUrl"
$env:NODE_ENV = 'production'

# Internal/demo release: prefill the login form with the demo-school accounts
# (same values as the `vps` profile in eas.json). Set APP_NO_PREFILL=1 to build
# a store APK that ships no credentials.
if ($env:APP_NO_PREFILL -ne '1') {
  $env:EXPO_PUBLIC_PREFILL_LOGIN = '1'
  $env:EXPO_PUBLIC_DEV_TEACHER_ID = 'teacher.demo@example.com'
  $env:EXPO_PUBLIC_DEV_TEACHER_PASSWORD = 'Demo@12345'
  $env:EXPO_PUBLIC_DEV_TRANSPORT_ID = 'transport.demo@example.com'
  $env:EXPO_PUBLIC_DEV_TRANSPORT_PASSWORD = 'Demo@12345'
  $env:EXPO_PUBLIC_DEV_STUDENT_ID = '9000022222'
  $env:EXPO_PUBLIC_DEV_PARENT_ID = '9000011111'
  # Demo parent: the OTP is prefilled too. The server accepts this fixed OTP only for
  # numbers listed in its LOGIN_DEMO_NUMBERS; every other number gets a random SMS OTP.
  $env:EXPO_PUBLIC_DEV_PARENT_OTP = '123456'
  $env:EXPO_PUBLIC_DEV_PRINCIPAL_ID = 'principal.demo@example.com'
  $env:EXPO_PUBLIC_DEV_PRINCIPAL_PASSWORD = 'Demo@12345'
}

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
if ($isProd) {
  Copy-Item android/app/build/outputs/apk/release/app-release.apk "$app\dist-apk\school-crm-$version.apk" -Force
  New-Item -ItemType Directory -Force "$app\..\apk" | Out-Null
  Copy-Item "$app\dist-apk\school-crm-$version.apk" "$app\..\apk\school-crm-$version.apk" -Force
  Write-Host "Built $app\dist-apk\school-crm-$version.apk (copied to apk\)"
} else {
  Copy-Item android/app/build/outputs/apk/release/app-release.apk "$app\dist-apk\school-crm-$version-local.apk" -Force
  Write-Host "Built $app\dist-apk\school-crm-$version-local.apk for $apiUrl (apk\ left untouched)"
}
} finally {
  Set-Location $env:USERPROFILE
}
