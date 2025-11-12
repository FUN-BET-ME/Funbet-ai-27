import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const useStatusChecks = () => {
  const [statusChecks, setStatusChecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const { showToast } = useToast();

  const fetchStatusChecks = useCallback(async (page = 1, pageSize = 20, clientName = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStatusChecks(page, pageSize, clientName);
      setStatusChecks(data.items);
      setPagination({
        page: data.page,
        pageSize: data.page_size,
        total: data.total,
        totalPages: data.total_pages,
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch status checks');
      showToast('Failed to fetch status checks', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const createStatusCheck = useCallback(async (clientName) => {
    setLoading(true);
    try {
      const newCheck = await api.createStatusCheck({ client_name: clientName });
      showToast('Status check created successfully!', 'success');
      // Refresh the list
      await fetchStatusChecks(pagination.page, pagination.pageSize);
      return newCheck;
    } catch (err) {
      showToast(err.message || 'Failed to create status check', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, fetchStatusChecks, showToast]);

  const deleteStatusCheck = useCallback(async (id) => {
    setLoading(true);
    try {
      await api.deleteStatusCheck(id);
      showToast('Status check deleted successfully!', 'success');
      // Refresh the list
      await fetchStatusChecks(pagination.page, pagination.pageSize);
    } catch (err) {
      showToast(err.message || 'Failed to delete status check', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, fetchStatusChecks, showToast]);

  useEffect(() => {
    fetchStatusChecks();
  }, []);

  return {
    statusChecks,
    loading,
    error,
    pagination,
    fetchStatusChecks,
    createStatusCheck,
    deleteStatusCheck,
  };
};
