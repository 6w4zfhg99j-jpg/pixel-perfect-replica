# VONA Studio Manager
- [x] Technical readiness audit: repaired real DMG creation, pinned app-specific data path, serialized atomic writes, safe migrated restore and Italian finance filter; local Electron launch/restart/export verified using existing desktop output, current source verified separately by 29 tests and finance UI/export. No new build or packaging performed.
- [x] Reused VONA Sequence Designer’s actual bundled Instrument Serif/Inter fonts, ivory/ink tokens, radiuses and button language; verified desktop/tablet/phone, student save/reload and 12 existing tests.
- [x] Serve SQLite WASM as a public client-loaded asset; verified asset response, 12 tests, studio workflow and backup restore.
- [x] Local SQLite schema, versioned initialization, transactional attendance/payment rules and 12 passing tests.
- [x] Dashboard, calendar, attendance, students, memberships, finance and settings core workflows.
- [x] Offline exports, backups, verified restore and isolated desktop source setup.
- [x] Verify student → purchase → recurring classes → booking → Present/Absent → finance → reload, backup restore and mobile layout.
- [ ] Packaged macOS offline launch and restart test — requires macOS hardware.
- [x] Default plans (Prova €10/1, Singola €15/1, Promo €80/8, Standard €100/8) with schema v3 migration; full student profile (overview, purchase history with payment status, attendance history with balance, Italian transaction log).
- [x] Custom activity types with colors (Yoga beige, Stretching dusty pink, Lezione individuale soft yellow defaults) and archivable expense categories (Affitto, Attrezzatura, Pubblicità, Marketing, Software, Trasporti, Altro) with schema v4 migration; color coding in calendar, lists, dashboard, profiles; Settings sections "Tipi di attività" and "Categorie di spesa".

## Remaining specification gaps
- Whole-series editing and indefinite recurrence are not implemented; current recurrence requires an explicit date range.
- Booking payment-type changes after booking are not implemented.
- Finance class filters cover linked single visits, not membership income allocation or shared expenses.
- Monthly income/expense charts are implemented; a separate net-profit chart is not yet implemented.
- No signed/notarized macOS application has been produced or tested on macOS; fresh desktop output incorporating the latest source fixes remains to be built.
- [x] Translate entire interface to Italian (default language): dashboard, navigation, buttons, calendar, students, memberships, finance, notifications, settings, errors; schema v2 migrates existing seed data to Italian.
- [x] Offline macOS desktop prep: audit clean, desktop:dmg script added, packaged app tested offline (student/class/booking/attendance/payment/membership + restart persistence).
