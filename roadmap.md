# VONA Studio Manager
- [x] Local SQLite schema, versioned initialization, transactional attendance/payment rules and 12 passing tests.
- [x] Dashboard, calendar, attendance, students, memberships, finance and settings core workflows.
- [x] Offline exports, backups, verified restore and isolated desktop source setup.
- [x] Verify student → purchase → recurring classes → booking → Present/Absent → finance → reload, backup restore and mobile layout.
- [ ] Packaged macOS offline launch and restart test — requires macOS hardware.

## Remaining specification gaps
- Whole-series editing and indefinite recurrence are not implemented; current recurrence requires an explicit date range.
- Booking payment-type changes after booking are not implemented.
- Finance class filters cover linked single visits, not membership income allocation or shared expenses.
- Monthly income/expense charts are implemented; a separate net-profit chart is not yet implemented.
- Default membership prices of €40/€80 are provisional and editable; the brief did not supply these amounts.
- No packaged or signed macOS application has been produced; Electron source is provided within the project only.