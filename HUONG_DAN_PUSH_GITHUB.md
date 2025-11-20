# Hướng dẫn cập nhật code lên GitHub

## Các bước cập nhật code lên GitHub

### 1. Kiểm tra trạng thái Git
```bash
git status
```

### 2. Thêm tất cả các thay đổi
```bash
# Thêm tất cả file đã sửa và file mới
git add .

# Hoặc thêm từng file cụ thể
git add backend/controllers/danhMucPhongBanController.js
git add frontend/src/components/admin/AttendanceManagement.js
```

### 3. Commit các thay đổi
```bash
git commit -m "Thêm thông báo cho nhân viên: phân công phòng ban, giao công việc, thiết lập KPI, bổ nhiệm trưởng phòng"
```

### 4. Push lên GitHub
```bash
git push origin main
```

## Nếu gặp lỗi conflict

### Nếu có conflict với remote:
```bash
# Lấy code mới nhất từ GitHub
git pull origin main

# Giải quyết conflict (nếu có)
# Sau đó commit lại
git add .
git commit -m "Merge conflicts resolved"
git push origin main
```

## Nếu muốn tạo branch mới

```bash
# Tạo branch mới
git checkout -b feature/notifications

# Commit và push
git add .
git commit -m "Thêm hệ thống thông báo"
git push origin feature/notifications
```

## Các file đã thay đổi trong commit này

### Backend:
- `backend/controllers/danhMucPhongBanController.js` - Thêm thông báo phân công phòng ban và bổ nhiệm trưởng phòng
- `backend/controllers/kpiTieuChiController.js` - Thêm thông báo thiết lập KPI
- `backend/controllers/congViecGiaoController.js` - Cải thiện thông báo giao công việc
- `backend/controllers/hoSoNhanVienController.js` - Thêm thông báo khi tạo nhân viên mới
- `backend/controllers/consentController.js` - Cải thiện error handling
- `backend/models/EventLogsUser.js` - Cải thiện validation

### Frontend:
- `frontend/src/components/admin/AttendanceManagement.js` - Component mới quản lý chấm công
- `frontend/src/components/admin/SmartContractLogs.js` - Component mới xem smart contract logs
- `frontend/src/components/admin/SystemSettings.js` - Component mới cài đặt hệ thống
- `frontend/src/components/AdminDashboard.js` - Thêm các component mới vào menu
- `frontend/src/components/admin/PayrollManagement.js` - Cải thiện hiển thị và xử lý lỗi
- `frontend/src/components/dashboard/ConsentManagement.js` - Cải thiện error handling
- `frontend/src/components/dashboard/NotificationsLogs.js` - Thêm filter, search, cải thiện hiển thị
- `frontend/src/components/dashboard/TaskManagement.js` - Sửa lỗi DOM nesting

### Files đã xóa:
- `HUONG_DAN_THAO_TAC_LUONG.md`
- `QUICK_START_LUONG.md`
- `backend/DEPLOY_GUIDE.md`
- `backend/NEXT_STEPS.md`
- `backend/QUICK_START.md`




