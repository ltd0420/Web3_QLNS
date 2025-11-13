import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import apiService from '../../services/apiService';

const statusColorMap = {
  Success: 'success',
  Failed: 'error',
  Pending: 'warning'
};

const SmartContractLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contractFilter, setContractFilter] = useState('');
  const [functionFilter, setFunctionFilter] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get('/smart-contract-logs');
      // API returns either { message, data } or array – normalise
      const data = response?.data?.data ?? response?.data ?? response ?? [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch smart contract logs error:', err);
      const message = err.response?.data?.message || err.message || 'Không thể tải dữ liệu ghi log smart contract.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !searchTerm ||
        log.transaction_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.contract_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.function_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || log.status === statusFilter;

      const matchContract = !contractFilter ||
        log.contract_address?.toLowerCase().includes(contractFilter.toLowerCase());

      const matchFunction = !functionFilter ||
        log.function_name?.toLowerCase().includes(functionFilter.toLowerCase());

      let matchDate = true;
      if (startDate) {
        const logDate = new Date(log.timestamp || log.createdAt || log.updatedAt || log.block_timestamp);
        matchDate = logDate >= startDate;
      }
      if (matchDate && endDate) {
        const logDate = new Date(log.timestamp || log.createdAt || log.updatedAt || log.block_timestamp);
        matchDate = logDate <= endDate;
      }

      return matchSearch && matchStatus && matchContract && matchFunction && matchDate;
    });
  }, [logs, searchTerm, statusFilter, contractFilter, functionFilter, startDate, endDate]);

  const handleExport = () => {
    const dataToExport = filteredLogs.map((log) => ({
      'Transaction Hash': log.transaction_hash,
      'Contract Address': log.contract_address,
      'Function': log.function_name,
      'Status': log.status,
      'Gas Used': log.gas_used,
      'Block Number': log.block_number,
      'Timestamp': log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SmartContractLogs');
    XLSX.writeFile(workbook, `smart_contract_logs_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">
            Smart Contract Logs
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchLogs}
              disabled={loading}
            >
              Làm mới
            </Button>
            <Button
              variant="contained"
              startIcon={<ExportIcon />}
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
            >
              Xuất Excel
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Tìm kiếm"
                  placeholder="Tx hash, địa chỉ hoặc hàm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{ endAdornment: <SearchIcon fontSize="small" /> }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    label="Trạng thái"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1 }} />}
                  >
                    <MenuItem value="all">Tất cả</MenuItem>
                    <MenuItem value="Success">Success</MenuItem>
                    <MenuItem value="Failed">Failed</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Địa chỉ hợp đồng"
                  value={contractFilter}
                  onChange={(e) => setContractFilter(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Tên hàm"
                  value={functionFilter}
                  onChange={(e) => setFunctionFilter(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Từ ngày"
                  value={startDate}
                  onChange={(value) => setStartDate(value)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Đến ngày"
                  value={endDate}
                  onChange={(value) => setEndDate(value)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Danh sách giao dịch ({filteredLogs.length})
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tx Hash</TableCell>
                      <TableCell>Hợp đồng</TableCell>
                      <TableCell>Hàm</TableCell>
                      <TableCell>Block</TableCell>
                      <TableCell>Gas Used</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell>Thời gian</TableCell>
                      <TableCell>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            Không có dữ liệu phù hợp bộ lọc.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log._id || log.transaction_hash} hover>
                          <TableCell sx={{ fontFamily: 'monospace' }}>
                            {log.transaction_hash || '—'}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>
                            {log.contract_address || '—'}
                          </TableCell>
                          <TableCell>{log.function_name || '—'}</TableCell>
                          <TableCell>{log.block_number ?? '—'}</TableCell>
                          <TableCell>{log.gas_used ?? '—'}</TableCell>
                          <TableCell>
                            <Chip
                              label={log.status || 'Unknown'}
                              color={statusColorMap[log.status] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—'}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Xem chi tiết">
                              <IconButton onClick={() => setSelectedLog(log)} size="small" color="primary">
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Chi tiết giao dịch</DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Transaction Hash</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {selectedLog.transaction_hash || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Địa chỉ hợp đồng</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {selectedLog.contract_address || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Hàm gọi</Typography>
                  <Typography variant="body1">{selectedLog.function_name || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">Block</Typography>
                  <Typography variant="body1">{selectedLog.block_number ?? '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">Gas Used</Typography>
                  <Typography variant="body1">{selectedLog.gas_used ?? '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">Trạng thái</Typography>
                  <Chip
                    label={selectedLog.status || 'Unknown'}
                    color={statusColorMap[selectedLog.status] || 'default'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Thời gian</Typography>
                  <Typography variant="body1">
                    {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString('vi-VN') : '—'}
                  </Typography>
                </Grid>
                {selectedLog.event_logs?.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Event Logs
                    </Typography>
                    {selectedLog.event_logs.map((event, index) => (
                      <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                        <CardContent>
                          <Typography variant="subtitle2">{event.event_name || `Event ${index + 1}`}</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(event.data || {}, null, 2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedLog(null)}>Đóng</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default SmartContractLogs;
