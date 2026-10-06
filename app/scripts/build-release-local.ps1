# Local release APK (no Expo/EAS cloud). Run from app/:  powershell -File scripts/build-release-local.ps1
# Output: android/app/build/outputs/apk/release/app-release.apk -> copied to dist-apk/school-crm-<version>.apk
$ErrorActionPreference = 'Stop'
$app = Split-Path -Parent $PSScriptRoot
Set-Location $app

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
New-Item -ItemType Directory -Force dist-apk | Out-Null
Copy-Item android/app/build/outputs/apk/release/app-release.apk "dist-apk/school-crm-$version.apk" -Force
Write-Host "Built dist-apk/school-crm-$version.apk"
