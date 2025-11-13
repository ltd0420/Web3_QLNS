import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  TextField,
  Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Cloud as CloudIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import apiService from '../../services/apiService';

const defaultSettings = {
  enableAIFeatures: true,
  autoSyncBlockchain: true,
  maintenanceMode: false,
  enableNotifications: true,
  dataRetentionDays: 90
};

const SystemSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [healthStatus, setHealthStatus] = useState({
    blockchain: null,
    database: null,
    payrollContract: null,
    aiService: null
  });
  const [stats, setStats] = useState({
    totalPayrolls: 0,
    totalFeedbacks: 0,
    totalAttendance: 0
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const stored = localStorage.getItem('systemSettings');
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch (err) {
        console.warn('Failed to parse system settings from storage', err);
      }
    }
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      // Health check blockchain & payroll contract
      const [balanceRes, attendanceRes, feedbackRes] = await Promise.allSettled([
        apiService.get('/payroll-contract/balance/summary'),
        apiService.get('/attendance'),
        apiService.get('/reviews')
      ]);

      if (balanceRes.status === 'fulfilled') {
        setHealthStatus((prev) => ({ ...prev, payrollContract: 'up', blockchain: 'up' }));
      } else {
        setHealthStatus((prev) => ({ ...prev, payrollContract: 'down', blockchain: 'unknown' }));
      }

      if (attendanceRes.status === 'fulfilled') {
        const data = attendanceRes.value?.data || attendanceRes.value || [];
        setStats((prev) => ({ ...prev, totalAttendance: Array.isArray(data) ? data.length : 0 }));
        setHealthStatus((prev) => ({ ...prev, database: 'up' }));
      } else {
        setHealthStatus((prev) => ({ ...prev, database: 'down' }));
      }

      if (feedbackRes.status === 'fulfilled') {
        const data = feedbackRes.value?.data?.data ?? feedbackRes.value?.data ?? feedbackRes.value ?? [];
        setStats((prev) => ({ ...prev, totalFeedbacks: Array.isArray(data) ? data.length : 0 }));
      }

      // Estimate AI service status via AI models endpoint
      try {
        const aiResponse = await apiService.get('/ai/models');
        const aiData = aiResponse?.data?.data ?? aiResponse?.data ?? aiResponse ?? [];
        setStats((prev) => ({ ...prev, totalAIModules: Array.isArray(aiData) ? aiData.length : 0 }));
        setHealthStatus((prev) => ({ ...prev, aiService: 'up' }));
      } catch (err) {
        setHealthStatus((prev) => ({ ...prev, aiService: 'down' }));
      }

      // payroll count (off existing logs)
      try {
        const payrollRes = await apiService.get('/payroll-contract/employee/all');
        const payrollData = payrollRes?.data?.data ?? payrollRes?.data ?? payrollRes ?? [];
        setStats((prev) => ({ ...prev, totalPayrolls: Array.isArray(payrollData) ? payrollData.length : 0 }));
      } catch (err) {
        setStats((prev) => ({ ...prev, totalPayrolls: 0 }));
      }

      setSnackbar({ open: true, message: 'Đã làm mới dữ liệu hệ thống.', severity: 'success' });
    } catch (error) {
      console.error('Refresh system data error:', error);
      setSnackbar({ open: true, message: 'Không thể tải dữ liệu hệ thống.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => (event) => {
    const updated = { ...settings, [key]: event.target.checked };
    setSettings(updated);
    localStorage.setItem('systemSettings', JSON.stringify(updated));
  };

  const handleValueChange = (key) => (event) => {
    const updated = { ...settings, [key]: Number(event.target.value) };
    setSettings(updated);
    localStorage.setItem('systemSettings', JSON.stringify(updated));
  };

  const healthChip = (status) => {
    if (status === 'up') {
      return <Chip icon={<CheckCircleIcon />} color="success" label="Hoạt động" size="small" />;
    }
    if (status === 'down') {
      return <Chip icon={<WarningIcon />} color="error" label="Gián đoạn" size="small" />;
    }
    return <Chip label="Không xác định" size="small" variant="outlined" />;
  };

  const activeFeatures = useMemo(() => {
    return [
      settings.enableAIFeatures && 'Tính năng AI',
      settings.autoSyncBlockchain && 'Đồng bộ blockchain',
      settings.enableNotifications && 'Thông báo realtime',
      settings.maintenanceMode && 'Chế độ bảo trì'
    ].filter(Boolean);
  }, [settings]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Cài đặt Hệ thống
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={refreshData}
          disabled={loading}
        >
          Làm mới
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Health status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CloudIcon color="primary" />
                <Typography variant="h6">Tình trạng dịch vụ</Typography>
              </Box>
              <List>
                <ListItem>
                  <ListItemText primary="Blockchain Node" secondary="Hardhat/Ganache RPC" />
                  {healthChip(healthStatus.blockchain)}
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="Hợp đồng Payroll" secondary="Truy vấn balance summary" />
                  {healthChip(healthStatus.payrollContract)}
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="Cơ sở dữ liệu" secondary="MongoDB attendance" />
                  {healthChip(healthStatus.database)}
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="Dịch vụ AI" secondary="AI models metadata" />
                  {healthChip(healthStatus.aiService)}
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Feature toggles */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SecurityIcon color="secondary" />
                <Typography variant="h6">Tính năng hệ thống</Typography>
              </Box>
              <FormControlLabel
                control={<Switch checked={settings.enableAIFeatures} onChange={handleToggle('enableAIFeatures')} />}
                label="Kích hoạt phân tích AI (BERT, giảm chiều dữ liệu)"
              />
              <FormControlLabel
                control={<Switch checked={settings.autoSyncBlockchain} onChange={handleToggle('autoSyncBlockchain')} />}
                label="Tự động đồng bộ giao dịch on-chain"
              />
              <FormControlLabel
                control={<Switch checked={settings.enableNotifications} onChange={handleToggle('enableNotifications')} />}
                label="Gửi thông báo realtime cho quản trị"
              />
              <FormControlLabel
                control={<Switch checked={settings.maintenanceMode} onChange={handleToggle('maintenanceMode')} />}
                label="Chế độ bảo trì hệ thống"
              />
              <Box mt={2}>
                <TextField
                  type="number"
                  label="Số ngày lưu log"
                  value={settings.dataRetentionDays}
                  onChange={handleValueChange('dataRetentionDays')}
                  helperText="Giá trị ảnh hưởng tới các cron dọn dẹp log phía server"
                  InputProps={{ inputProps: { min: 7, max: 365 } }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AssessmentIcon color="info" />
                <Typography variant="h6">Thống kê nhanh</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Payroll hiện có</Typography>
                      <Typography variant="h5" fontWeight={700}>{stats.totalPayrolls}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Bản ghi chấm công</Typography>
                      <Typography variant="h5" fontWeight={700}>{stats.totalAttendance}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Phản hồi khách hàng</Typography>
                      <Typography variant="h5" fontWeight={700}>{stats.totalFeedbacks}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              <Box mt={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Tính năng đang bật
                </Typography>
                {activeFeatures.length === 0 ? (
                  <Typography color="text.secondary">Hiện không có tính năng nào được bật.</Typography>
                ) : (
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {activeFeatures.map((feature) => (
                      <Chip key={feature} label={feature} color="primary" variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <SettingsIcon color="action" />
                <Typography variant="h6">Hướng dẫn</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Các thay đổi ở đây được lưu cục bộ để hỗ trợ thao tác nhanh cho quản trị viên. Đối với cấu hình chính thức,
                hãy cập nhật file <code>.env</code> hoặc sử dụng script <code>backend/scripts/update-env.js</code> và triển khai lại backend.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Nếu cần mở rộng để đồng bộ với backend, hãy tạo API lưu trữ cấu hình vào MongoDB và cập nhật component này gọi tới API đó.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default SystemSettings;
