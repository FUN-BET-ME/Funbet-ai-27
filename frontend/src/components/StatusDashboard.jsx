import React, { useState, useMemo } from 'react';
import { useStatusChecks } from '../hooks/useStatusChecks';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import { Loader2, Plus, Trash2, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import StatsCards from './StatsCards';

const StatusDashboard = () => {
  const {
    statusChecks,
    loading,
    pagination,
    fetchStatusChecks,
    createStatusCheck,
    deleteStatusCheck,
  } = useStatusChecks();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    
    try {
      await createStatusCheck(newClientName);
      setNewClientName('');
      setIsCreateDialogOpen(false);
    } catch (err) {
      console.error('Create error:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStatusCheck(id);
      setDeleteId(null);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleSearch = () => {
    fetchStatusChecks(1, pagination.pageSize, searchQuery || null);
  };

  const handleRefresh = () => {
    fetchStatusChecks(pagination.page, pagination.pageSize, searchQuery || null);
  };

  const handlePageChange = (newPage) => {
    fetchStatusChecks(newPage, pagination.pageSize, searchQuery || null);
  };

  // Memoize formatted data to prevent unnecessary recalculations
  const formattedStatusChecks = useMemo(() => {
    return statusChecks.map(check => ({
      ...check,
      formattedTimestamp: format(new Date(check.timestamp), 'MMM dd, yyyy HH:mm:ss'),
    }));
  }, [statusChecks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800" data-testid="status-dashboard">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2" data-testid="dashboard-title">
            Status Check Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400" data-testid="dashboard-description">
            Monitor and manage your status checks with real-time updates
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Main Card */}
        <Card className="shadow-lg" data-testid="main-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl" data-testid="card-title">Status Checks</CardTitle>
                <CardDescription data-testid="card-description">
                  Total: {pagination.total} checks | Page {pagination.page} of {pagination.totalPages}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  data-testid="refresh-button"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="add-status-button">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Status Check
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="create-dialog">
                    <form onSubmit={handleCreate}>
                      <DialogHeader>
                        <DialogTitle>Create New Status Check</DialogTitle>
                        <DialogDescription>
                          Enter a client name to create a new status check.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="client-name">Client Name</Label>
                        <Input
                          id="client-name"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="Enter client name"
                          className="mt-2"
                          data-testid="client-name-input"
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={loading} data-testid="submit-create-button">
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by client name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading} data-testid="search-button">
                Search
              </Button>
              {searchQuery && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    fetchStatusChecks(1, pagination.pageSize, null);
                  }}
                  variant="outline"
                  data-testid="clear-search-button"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Table */}
            {loading && statusChecks.length === 0 ? (
              <div className="flex justify-center items-center py-12" data-testid="loading-spinner">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : statusChecks.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-state">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No status checks found. Create your first one!
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border" data-testid="status-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formattedStatusChecks.map((check) => (
                        <TableRow key={check.id} data-testid={`status-row-${check.id}`}>
                          <TableCell className="font-mono text-xs">
                            <Badge variant="outline" data-testid={`status-id-${check.id}`}>
                              {check.id.substring(0, 8)}...
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`status-client-${check.id}`}>
                            {check.client_name}
                          </TableCell>
                          <TableCell data-testid={`status-timestamp-${check.id}`}>
                            {check.formattedTimestamp}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog
                              open={deleteId === check.id}
                              onOpenChange={(open) => setDeleteId(open ? check.id : null)}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  data-testid={`delete-button-${check.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent data-testid={`delete-dialog-${check.id}`}>
                                <DialogHeader>
                                  <DialogTitle>Confirm Deletion</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete this status check for{' '}
                                    <strong>{check.client_name}</strong>? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setDeleteId(null)}
                                    data-testid={`cancel-delete-button-${check.id}`}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleDelete(check.id)}
                                    disabled={loading}
                                    data-testid={`confirm-delete-button-${check.id}`}
                                  >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4" data-testid="pagination">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                      {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                      {pagination.total} results
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1 || loading}
                        data-testid="prev-page-button"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages || loading}
                        data-testid="next-page-button"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default React.memo(StatusDashboard);
