# School CRM — Teacher Mobile App (Flutter Developer Handoff)

This guide accompanies the UI mockup images and interactive prototype for building the **Teacher APK** using Flutter.

All APIs referenced below are already implemented and live in `platform-service` (`:5002` / Gateway `/api/v1/platform`). Refer to [`teacher-apk-api.md`](file:///c:/Users/admin/Documents/GitHub/School-CRM/docs/teacher-apk-api.md) for full endpoint specifications.

---

## 📱 Generated UI Screens & Assets

All screen assets are saved directly in [`docs/teacher-app-ui/`](file:///c:/Users/admin/Documents/GitHub/School-CRM/docs/teacher-app-ui):

| Screen | File Name | Description | Key Backend API |
|---|---|---|---|
| **01. Login** | `01_login_screen.jpg` | School branding, Teacher ID / Email input, Password toggle, Biometrics | `POST /school-portal/auth/teacher-login` |
| **02. Dashboard / Home** | `02_dashboard_home.jpg` | Next period hero card, 4 Metric cards, Quick actions grid, Bottom navigation | `GET /school-portal/teacher/dashboard`<br>`GET /school-portal/teacher/today-schedule` |
| **03. Mark Attendance** | `03_attendance_marking.jpg` | Section selector, Date picker, Summary pills (P/A/L/HD), Roster with quick chips, Finalize lock | `GET /school-portal/teacher/attendance/today`<br>`POST /school-portal/teacher/attendance` |
| **04. Timetable** | Interactive Prototype | Mon–Sat day switcher, Timeline cards (P1, P2), Active live class pulse, Recess slots | `GET /school-portal/teacher/timetable`<br>`GET /school-portal/teacher/timetable/day/:day` |
| **05. Homework** | Interactive Prototype | Active / Review / History tabs, Submissions progress badge, Creation FAB | `GET /school-portal/teacher/homework`<br>`POST /school-portal/teacher/homework` |
| **06. Exam Marks Entry** | Interactive Prototype | Exam selector, Subject paper, Max Marks, Roll list with score inputs, Draft/Submit | `GET /school-portal/teacher/exams/:id/marks`<br>`POST /school-portal/teacher/exams/:id/marks` |
| **07. Leave Management** | Interactive Prototype | Casual/Medical/Earned leave balance cards, Pending/Approved status chips, Apply form | `GET /school-portal/teacher/leaves`<br>`POST /school-portal/teacher/leaves` |
| **08. Profile & Settings** | Interactive Prototype | Teacher avatar, Employee Code, Assigned classes, Password reset, Logout | `GET /school-portal/teacher/profile`<br>`PATCH /school-portal/teacher/change-password` |

> 💡 **Live Interactive Preview**: Open [`docs/teacher-app-ui/index.html`](file:///c:/Users/admin/Documents/GitHub/School-CRM/docs/teacher-app-ui/index.html) in any browser to click through all 8 interactive mobile screens and view responsive Flutter layouts.

---

## 🎨 Design System & Flutter Theme Tokens

### 1. Color Palette

```dart
class AppColors {
  // Primary
  static const Color primary = Color(0xFF2563EB);       // Blue 600
  static const Color primaryDark = Color(0xFF1D4ED8);   // Blue 700
  static const Color primaryLight = Color(0xFFEFF6FF);  // Blue 50
  
  // Status Accents
  static const Color presentGreen = Color(0xFF10B981);  // Emerald 500
  static const Color absentRed = Color(0xFFEF4444);     // Red 500
  static const Color lateAmber = Color(0xFFF59E0B);     // Amber 500
  static const Color halfDayIndigo = Color(0xFF6366F1); // Indigo 500
  
  // Backgrounds & Surfaces
  static const Color scaffoldBg = Color(0xFFF8FAFC);    // Slate 50
  static const Color cardSurface = Color(0xFFFFFFFF);   // White
  static const Color borderSubtle = Color(0xFFE2E8F0);  // Slate 200
  
  // Typography
  static const Color textPrimary = Color(0xFF0F172A);   // Slate 900
  static const Color textSecondary = Color(0xFF64748B); // Slate 500
  static const Color textDisabled = Color(0xFF94A3B8);  // Slate 400
}
```

### 2. Geometry & Spacing
- **Card Border Radius**: `16.0` (`BorderRadius.circular(16)`)
- **Button Border Radius**: `12.0` (`BorderRadius.circular(12)`)
- **Chip Border Radius**: `8.0` (`BorderRadius.circular(8)`)
- **Content Padding**: `EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0)`
- **Card Elevation**: `0` with subtle border `Border.all(color: AppColors.borderSubtle)` or `elevation: 1`

---

## ⚡ Key Flutter Implementation Requirements

### 1. Auth & JWT Token Interceptor
- Storage: Use `flutter_secure_storage` to save `accessToken`, `teacherId`, and `schoolId`.
- Attach `Authorization: Bearer <accessToken>` to every Dio / Http request via an Interceptor.
- On `401 UNAUTHORIZED`: Immediately clear session and route to `LoginScreen`.
- On `402 PAYMENT_REQUIRED`: The school subscription has expired; show subscription alert modal.

### 2. Idempotency & Offline Attendance
- For `POST /attendance` and `POST /exams/:id/marks`:
  - Generate a `UUID v4` as the `Idempotency-Key` header.
  - Store pending attendance submissions locally using Hive / Isar / SQLite when offline.
  - Sync when connection restores. If server returns `409 ATTENDANCE_FINALIZED`, alert teacher that the date was already locked by admin.

### 3. File Downloads & Material Uploads
- Study material downloads require auth: Append `?t=<accessToken>` to `/uploads/teacher-resources/...` or pass the `Bearer` token.
- Supported file types: PDF, DOCX, PPTX, JPG, PNG (Max 10 MB).

---

## 🚀 Recommended Flutter Project Structure

```
lib/
├── core/
│   ├── api/
│   │   ├── api_client.dart          // Dio with AuthInterceptor & Error handlers
│   │   └── endpoints.dart           // Route constants
│   ├── theme/
│   │   ├── app_colors.dart
│   │   └── app_theme.dart
│   └── utils/
│       └── idempotency.dart
├── features/
│   ├── auth/                        // Login & session management
│   ├── home/                        // Dashboard & stats
│   ├── attendance/                  // Student roster & P/A/L marking
│   ├── timetable/                   // Schedule view & day filters
│   ├── homework/                    // Assignments & submissions
│   ├── marks/                       // Exam scores entry
│   ├── leave/                       // Leave requests & balance
│   └── profile/                     // Teacher profile & settings
└── main.dart
```
