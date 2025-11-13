import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, TextField, MenuItem, FormControl, InputLabel, Select,
  IconButton, Tooltip, Alert, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Tabs, Tab, Autocomplete, Divider,
  LinearProgress
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import apiService from '../../services/apiService';
import * as XLSX from 'xlsx';

const AttendanceManagement = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalWorkingDays: 0,
    totalOvertimeHours: 0,
    averageWorkingHours: 0,
    onChainCount: 0
  });

  // Filter states
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [statusFilter, setStatusFilter] = useState('all');
  const [onChainFilter, setOnChainFilter] = useState('all');

  // Dialog states
  const [detailDialog, setDetailDialog] = useState({ open: false, record: null });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [attendanceRes, employeesRes, departmentsRes] = await Promise.allSettled([
        apiService.get('/attendance'),
        apiService.getAllEmployees(),
        apiService.getAllDepartments()
      ]);

      if (attendanceRes.status === 'fulfilled') {
        const data = attendanceRes.value?.data || attendanceRes.value || [];
        setAttendanceData(Array.isArray(data) ? data : []);
        calculateStats(Array.isArray(data) ? data : []);
      }

      if (employeesRes.status === 'fulfilled') {
        setEmployees(employeesRes.value || []);
      }

      if (departmentsRes.status === 'fulfilled') {
        setDepartments(departmentsRes.value || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const totalRecords = data.length;
    const totalWorkingDays = data.filter(r => r.trang_thai === 'Đã chấm công').length;
    const totalOvertimeHours = data.reduce((sum, r) => sum + (r.gio_lam_them || 0), 0);
    const totalWorkingHours = data.reduce((sum, r) => sum + (r.tong_gio_lam || 0), 0);
    const averageWorkingHours = totalWorkingDays > 0 ? totalWorkingHours / totalWorkingDays : 0;
    const onChainCount = data.filter(r => r.transaction_hash).length;

    setStats({
      totalRecords,
      totalWorkingDays,
      totalOvertimeHours,
      averageWorkingHours,
      onChainCount
    });
  };

  const handleFilter = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (selectedEmployee) {
        params.employeeDid = selectedEmployee.employee_did;
      }
      if (startDate && endDate) {
        params.startDate = format(startDate, 'yyyy-MM-dd');
        params.endDate = format(endDate, 'yyyy-MM-dd');
      }

      let url = '/attendance';
      if (selectedEmployee) {
        url = `/attendance/employee/${selectedEmployee.employee_did}`;
      }

      const response = await apiService.get(url, params);
      let data = response?.data || response || [];
      data = Array.isArray(data) ? data : [];

      // Apply additional filters
      if (selectedDepartment) {
        const deptEmployeeIds = employees
          .filter(e => e.phong_ban_id === selectedDepartment.phong_ban_id)
          .map(e => e.employee_did);
        data = data.filter(r => deptEmployeeIds.includes(r.employee_did));
      }

      if (statusFilter !== 'all') {
        data = data.filter(r => r.trang_thai === statusFilter);
      }

      if (onChainFilter === 'onchain') {
        data = data.filter(r => r.transaction_hash);
      } else if (onChainFilter === 'offchain') {
        data = data.filter(r => !r.transaction_hash);
      }

      setAttendanceData(data);
      calculateStats(data);

    } catch (error) {
      console.error('Error filtering attendance:', error);
      setError('Không thể lọc dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedEmployee(null);
    setSelectedDepartment(null);
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
    setStatusFilter('all');
    setOnChainFilter('all');
    fetchInitialData();
  };

  const handleExportExcel = () => {
    const dataToExport = filteredData.map(record => {
      const employee = employees.find(e => e.employee_did === record.employee_did);
      const department = departments.find(d => d.phong_ban_id === employee?.phong_ban_id);
      
      return {
        'Ngày': new Date(record.ngay_cham_cong || record.ngay).toLocaleDateString('vi-VN'),
        'Nhân viên': employee?.ho_ten || record.employee_did,
        'Phòng ban': department?.ten_phong_ban || 'N/A',
        'Loại ngày': record.loai_ngay || 'Ngày thường',
        'Giờ vào': record.gio_vao ? formatTime(record.gio_vao) : '--:--',
        'Giờ ra': record.gio_ra ? formatTime(record.gio_ra) : '--:--',
        'Tổng giờ': record.tong_gio_lam ? `${record.tong_gio_lam.toFixed(2)}h` : '--',
        'Giờ làm thêm': record.gio_lam_them ? `${record.gio_lam_them.toFixed(2)}h` : '0h',
        'Phương thức xác thực': record.xac_thuc_qua || 'Web App',
        'Trạng thái': record.trang_thai || 'Đã chấm công',
        'On-chain': record.transaction_hash ? 'Có' : 'Không',
        'Transaction Hash': record.transaction_hash || '--'
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ChamCong');
    XLSX.writeFile(wb, `quan_ly_cham_cong_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    return timeString.slice(0, 5);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Đã chấm công':
        return 'success';
      case 'Vắng mặt':
        return 'error';
      case 'Nghỉ phép':
        return 'warning';
      case 'Nghỉ ốm':
        return 'info';
      default:
        return 'default';
    }
  };

  const getDayTypeColor = (loaiNgay) => {
    switch (loaiNgay) {
      case 'Ngày thường':
        return 'primary';
      case 'Cuối tuần':
        return 'secondary';
      case 'Lễ':
        return 'success';
      default:
        return 'default';
    }
  };

  const filteredData = attendanceData;

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Statistics Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <ScheduleIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Tổng bản ghi</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {stats.totalRecords}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Ngày làm việc</Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {stats.totalWorkingDays}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <AccessTimeIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Giờ làm thêm</Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              {stats.totalOvertimeHours.toFixed(1)}h
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <TrendingUpIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">TB giờ làm/ngày</Typography>
            </Box>
            <Typography variant="h4" color="info.main">
              {stats.averageWorkingHours.toFixed(1)}h
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Chart/Summary Section */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Tóm tắt</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Tỷ lệ on-chain
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={stats.totalRecords > 0 ? (stats.onChainCount / stats.totalRecords) * 100 : 0}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" mt={1}>
                    {stats.onChainCount} / {stats.totalRecords} bản ghi
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderAttendanceListTab = () => (
    <Grid container spacing={3}>
      {/* Filters */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Bộ lọc</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={employees}
                  getOptionLabel={(option) => option.ho_ten || option.employee_did}
                  value={selectedEmployee}
                  onChange={(e, newValue) => setSelectedEmployee(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Nhân viên" size="small" />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={departments}
                  getOptionLabel={(option) => option.ten_phong_ban}
                  value={selectedDepartment}
                  onChange={(e, newValue) => setSelectedDepartment(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Phòng ban" size="small" />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="Từ ngày"
                  value={startDate}
                  onChange={setStartDate}
                  renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="Đến ngày"
                  value={endDate}
                  onChange={setEndDate}
                  renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Trạng thái"
                  >
                    <MenuItem value="all">Tất cả</MenuItem>
                    <MenuItem value="Đã chấm công">Đã chấm công</MenuItem>
                    <MenuItem value="Vắng mặt">Vắng mặt</MenuItem>
                    <MenuItem value="Nghỉ phép">Nghỉ phép</MenuItem>
                    <MenuItem value="Nghỉ ốm">Nghỉ ốm</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>On-chain</InputLabel>
                  <Select
                    value={onChainFilter}
                    onChange={(e) => setOnChainFilter(e.target.value)}
                    label="On-chain"
                  >
                    <MenuItem value="all">Tất cả</MenuItem>
                    <MenuItem value="onchain">On-chain</MenuItem>
                    <MenuItem value="offchain">Off-chain</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={handleFilter}
                    disabled={loading}
                  >
                    Tìm kiếm
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleResetFilters}
                  >
                    Đặt lại
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<ExportIcon />}
                    onClick={handleExportExcel}
                    disabled={filteredData.length === 0}
                  >
                    Xuất Excel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Attendance Table */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Danh sách chấm công ({filteredData.length} bản ghi)
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : filteredData.length === 0 ? (
              <Box textAlign="center" py={4}>
                <ScheduleIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  Chưa có dữ liệu chấm công
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Ngày</strong></TableCell>
                      <TableCell><strong>Nhân viên</strong></TableCell>
                      <TableCell><strong>Phòng ban</strong></TableCell>
                      <TableCell><strong>Loại ngày</strong></TableCell>
                      <TableCell><strong>Giờ vào</strong></TableCell>
                      <TableCell><strong>Giờ ra</strong></TableCell>
                      <TableCell><strong>Tổng giờ</strong></TableCell>
                      <TableCell><strong>Giờ làm thêm</strong></TableCell>
                      <TableCell><strong>Trạng thái</strong></TableCell>
                      <TableCell><strong>On-chain</strong></TableCell>
                      <TableCell><strong>Thao tác</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.map((record) => {
                      const employee = employees.find(e => e.employee_did === record.employee_did);
                      const department = departments.find(d => d.phong_ban_id === employee?.phong_ban_id);
                      
                      return (
                        <TableRow key={record._id} hover>
                          <TableCell>
                            {new Date(record.ngay_cham_cong || record.ngay).toLocaleDateString('vi-VN')}
                          </TableCell>
                          <TableCell>
                            {employee?.ho_ten || record.employee_did}
                          </TableCell>
                          <TableCell>
                            {department?.ten_phong_ban || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={record.loai_ngay || 'Ngày thường'}
                              color={getDayTypeColor(record.loai_ngay)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {record.gio_vao ? formatTime(record.gio_vao) : '--:--'}
                          </TableCell>
                          <TableCell>
                            {record.gio_ra ? formatTime(record.gio_ra) : '--:--'}
                          </TableCell>
                          <TableCell>
                            {record.tong_gio_lam ? `${record.tong_gio_lam.toFixed(2)}h` : '--'}
                          </TableCell>
                          <TableCell>
                            {record.gio_lam_them ? `${record.gio_lam_them.toFixed(2)}h` : '0h'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={record.trang_thai || 'Đã chấm công'}
                              color={getStatusColor(record.trang_thai)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={record.transaction_hash ? 'Có' : 'Không'}
                              color={record.transaction_hash ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Xem chi tiết">
                              <IconButton
                                size="small"
                                onClick={() => setDetailDialog({ open: true, record })}
                                color="primary"
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">
            Quản lý Chấm công
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchInitialData}
            disabled={loading}
          >
            Làm mới
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Tổng quan" />
            <Tab label="Danh sách chấm công" />
          </Tabs>
        </Box>

        {activeTab === 0 && renderOverviewTab()}
        {activeTab === 1 && renderAttendanceListTab()}

        {/* Detail Dialog */}
        <Dialog
          open={detailDialog.open}
          onClose={() => setDetailDialog({ open: false, record: null })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Chi tiết chấm công</DialogTitle>
          <DialogContent>
            {detailDialog.record && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Ngày</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {new Date(detailDialog.record.ngay_cham_cong || detailDialog.record.ngay).toLocaleDateString('vi-VN')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Nhân viên</Typography>
                  <Typography variant="body1">
                    {employees.find(e => e.employee_did === detailDialog.record.employee_did)?.ho_ten || detailDialog.record.employee_did}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Giờ vào</Typography>
                  <Typography variant="body1">
                    {detailDialog.record.gio_vao ? formatTime(detailDialog.record.gio_vao) : '--:--'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Giờ ra</Typography>
                  <Typography variant="body1">
                    {detailDialog.record.gio_ra ? formatTime(detailDialog.record.gio_ra) : '--:--'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Tổng giờ làm</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {detailDialog.record.tong_gio_lam ? `${detailDialog.record.tong_gio_lam.toFixed(2)}h` : '--'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Giờ làm thêm</Typography>
                  <Typography variant="body1">
                    {detailDialog.record.gio_lam_them ? `${detailDialog.record.gio_lam_them.toFixed(2)}h` : '0h'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Phương thức xác thực</Typography>
                  <Typography variant="body1">
                    {detailDialog.record.xac_thuc_qua || 'Web App'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Trạng thái on-chain</Typography>
                  <Chip
                    label={detailDialog.record.transaction_hash ? 'On-chain' : 'Off-chain'}
                    color={detailDialog.record.transaction_hash ? 'success' : 'default'}
                    size="small"
                  />
                </Grid>
                {detailDialog.record.transaction_hash && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Transaction Hash</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {detailDialog.record.transaction_hash}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialog({ open: false, record: null })}>Đóng</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AttendanceManagement;

