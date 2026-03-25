/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/**
 * Integration Tests for TransactionHistory Component
 *
 * These tests verify the complete integration of:
 * - TransactionHistory component
 * - useFilterState hook
 * - useTransactionHistory hook
 * - API service layer
 * - TanStack Query
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import TransactionHistory from '../pages/TransactionHistory';
import * as transactionHistoryApi from '../services/transactionHistoryApi';

// Mock the contract service to avoid initialization issues
vi.mock('../services/contracts', () => ({
  contractService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getContractId: vi.fn().mockReturnValue('CMOCK123'),
  },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

/**
 * Helper function to render component with all required providers
 */
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Disable caching in tests
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('TransactionHistory Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders component and fetches initial data', async () => {
    // Mock successful API response
    const mockData = {
      items: [
        {
          id: 'audit-1',
          kind: 'classic' as const,
          createdAt: '2024-01-15T10:00:00Z',
          status: 'confirmed',
          amount: '100',
          asset: 'XLM',
          actor: 'GABC123',
          txHash: 'abc123',
          label: 'Transaction Confirmed',
          badge: 'Classic',
        },
        {
          id: 'contract-1',
          kind: 'contract' as const,
          createdAt: '2024-01-15T11:00:00Z',
          status: 'indexed',
          amount: '1000',
          asset: 'USDC',
          actor: 'CABC123',
          txHash: 'def456',
          label: 'Transfer Event',
          badge: 'Contract Event',
        },
      ],
      hasMore: false,
      total: 2,
    };

    vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockResolvedValue(mockData);

    renderWithProviders(<TransactionHistory />);

    // Verify page title is rendered
    expect(screen.getByText(/Transaction/)).toBeInTheDocument();
    expect(screen.getByText(/History/)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Transaction Confirmed')).toBeInTheDocument();
    });

    // Verify both timeline items are displayed
    expect(screen.getByText('Transaction Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Transfer Event')).toBeInTheDocument();

    // Verify badges are displayed
    expect(screen.getByText('Classic')).toBeInTheDocument();
    expect(screen.getByText('Contract Event')).toBeInTheDocument();

    // Verify status badges
    expect(screen.getAllByText('confirmed')).toHaveLength(1);
    expect(screen.getAllByText('indexed')).toHaveLength(1);
  });

  test('displays loading skeleton during initial load', async () => {
    // Mock delayed API response
    vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                items: [],
                hasMore: false,
                total: 0,
              }),
            100
          )
        )
    );

    renderWithProviders(<TransactionHistory />);

    // Verify loading skeleton is displayed
    const skeletons = screen
      .getAllByRole('generic')
      .filter((el) => el.className.includes('animate-pulse'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('displays empty state when no data', async () => {
    // Mock empty API response
    vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockResolvedValue({
      items: [],
      hasMore: false,
      total: 0,
    });

    renderWithProviders(<TransactionHistory />);

    // Wait for empty state to appear
    await waitFor(() => {
      expect(screen.getByText('No transactions found')).toBeInTheDocument();
    });

    expect(screen.getByText(/Try adjusting your filters/)).toBeInTheDocument();
  });

  test('displays error state and retry button on API failure', async () => {
    // Mock API error
    vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockRejectedValue(
      new Error('Network error')
    );

    renderWithProviders(<TransactionHistory />);

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    // Verify retry button is present
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  test('opens and closes filter panel', async () => {
    const user = userEvent.setup();

    vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockResolvedValue({
      items: [],
      hasMore: false,
      total: 0,
    });

    renderWithProviders(<TransactionHistory />);

    // Find and click the Filters button
    const filtersButton = screen.getByRole('button', { name: /Filters/i });
    await user.click(filtersButton);

    // Verify filter panel is displayed
    await waitFor(() => {
      expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    });

    // Verify filter inputs are present
    expect(screen.getByPlaceholderText(/Tx hash/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Name or wallet/)).toBeInTheDocument();

    // Close filter panel
    await user.click(filtersButton);

    // Verify filter panel is hidden
    await waitFor(() => {
      expect(screen.queryByText('Advanced Filters')).not.toBeInTheDocument();
    });
  });

  test('updates filters and triggers debounced API call', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockResolvedValue({
      items: [],
      hasMore: false,
      total: 0,
    });

    renderWithProviders(<TransactionHistory />);

    // Wait for initial load
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // Open filters
    const filtersButton = screen.getByRole('button', { name: /Filters/i });
    await user.click(filtersButton);

    // Update status filter
    const statusSelect = screen.getByLabelText(/Status/i);
    await user.selectOptions(statusSelect, 'confirmed');

    // Wait for debounced API call (300ms + processing time)
    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledTimes(2);
      },
      { timeout: 1000 }
    );

    // Verify the API was called with the correct filter
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          status: 'confirmed',
        }),
      }),
      undefined
    );
  });

  test('displays active filter count badge', async () => {
    const user = userEvent.setup();

    vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockResolvedValue({
      items: [],
      hasMore: false,
      total: 0,
    });

    renderWithProviders(<TransactionHistory />);

    // Initially no filters active
    expect(screen.getByRole('button', { name: /Filters$/i })).toBeInTheDocument();

    // Open filters
    const filtersButton = screen.getByRole('button', { name: /Filters/i });
    await user.click(filtersButton);

    // Add a filter
    const statusSelect = screen.getByLabelText(/Status/i);
    await user.selectOptions(statusSelect, 'confirmed');

    // Wait for filter count to update
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Filters \(1\)/i })).toBeInTheDocument();
    });

    // Add another filter
    const assetInput = screen.getByPlaceholderText(/USDC, XLM/);
    await user.type(assetInput, 'USDC');

    // Wait for filter count to update
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Filters \(2\)/i })).toBeInTheDocument();
    });
  });

  test('resets all filters when Clear All is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockResolvedValue({
      items: [],
      hasMore: false,
      total: 0,
    });

    renderWithProviders(<TransactionHistory />);

    // Open filters
    const filtersButton = screen.getByRole('button', { name: /Filters/i });
    await user.click(filtersButton);

    // Add filters
    const statusSelect = screen.getByLabelText(/Status/i);
    await user.selectOptions(statusSelect, 'confirmed');

    const assetInput = screen.getByPlaceholderText(/USDC, XLM/);
    await user.type(assetInput, 'USDC');

    // Wait for filters to be applied
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Filters \(2\)/i })).toBeInTheDocument();
    });

    // Click Clear All
    const clearButton = screen.getByRole('button', { name: /Clear All/i });
    await user.click(clearButton);

    // Verify filters are reset
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Filters$/i })).toBeInTheDocument();
    });

    // Verify filter inputs are cleared
    expect(statusSelect).toHaveValue('');
    expect(assetInput).toHaveValue('');
  });

  test('displays Load More button when hasMore is true', async () => {
    // Mock API response with more data available
    vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockResolvedValue({
      items: [
        {
          id: 'audit-1',
          kind: 'classic' as const,
          createdAt: '2024-01-15T10:00:00Z',
          status: 'confirmed',
          amount: '100',
          asset: 'XLM',
          actor: 'GABC123',
          txHash: 'abc123',
          label: 'Transaction Confirmed',
          badge: 'Classic',
        },
      ],
      hasMore: true,
      total: 50,
    });

    renderWithProviders(<TransactionHistory />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Transaction Confirmed')).toBeInTheDocument();
    });

    // Verify Load More button is displayed
    expect(screen.getByRole('button', { name: /Load older records/i })).toBeInTheDocument();
  });

  test('hides Load More button when hasMore is false', async () => {
    // Mock API response with no more data
    vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockResolvedValue({
      items: [
        {
          id: 'audit-1',
          kind: 'classic' as const,
          createdAt: '2024-01-15T10:00:00Z',
          status: 'confirmed',
          amount: '100',
          asset: 'XLM',
          actor: 'GABC123',
          txHash: 'abc123',
          label: 'Transaction Confirmed',
          badge: 'Classic',
        },
      ],
      hasMore: false,
      total: 1,
    });

    renderWithProviders(<TransactionHistory />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Transaction Confirmed')).toBeInTheDocument();
    });

    // Verify Load More button is NOT displayed
    expect(screen.queryByRole('button', { name: /Load older records/i })).not.toBeInTheDocument();
  });

  test('loads more data when Load More button is clicked', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(transactionHistoryApi, 'fetchHistoryPage');

    // First page response
    fetchSpy.mockResolvedValueOnce({
      items: [
        {
          id: 'audit-1',
          kind: 'classic' as const,
          createdAt: '2024-01-15T10:00:00Z',
          status: 'confirmed',
          amount: '100',
          asset: 'XLM',
          actor: 'GABC123',
          txHash: 'abc123',
          label: 'Transaction 1',
          badge: 'Classic',
        },
      ],
      hasMore: true,
      total: 2,
    });

    // Second page response
    fetchSpy.mockResolvedValueOnce({
      items: [
        {
          id: 'audit-2',
          kind: 'classic' as const,
          createdAt: '2024-01-15T09:00:00Z',
          status: 'confirmed',
          amount: '200',
          asset: 'XLM',
          actor: 'GDEF456',
          txHash: 'def456',
          label: 'Transaction 2',
          badge: 'Classic',
        },
      ],
      hasMore: false,
      total: 2,
    });

    renderWithProviders(<TransactionHistory />);

    // Wait for initial data
    await waitFor(() => {
      expect(screen.getByText('Transaction 1')).toBeInTheDocument();
    });

    // Click Load More
    const loadMoreButton = screen.getByRole('button', { name: /Load older records/i });
    await user.click(loadMoreButton);

    // Wait for second page data
    await waitFor(() => {
      expect(screen.getByText('Transaction 2')).toBeInTheDocument();
    });

    // Verify both items are displayed
    expect(screen.getByText('Transaction 1')).toBeInTheDocument();
    expect(screen.getByText('Transaction 2')).toBeInTheDocument();

    // Verify Load More button is hidden (no more data)
    expect(screen.queryByRole('button', { name: /Load older records/i })).not.toBeInTheDocument();
  });

  test('displays contract event badge differently from classic badge', async () => {
    // Mock mixed data
    vi.spyOn(transactionHistoryApi, 'fetchHistoryPage').mockResolvedValue({
      items: [
        {
          id: 'audit-1',
          kind: 'classic' as const,
          createdAt: '2024-01-15T10:00:00Z',
          status: 'confirmed',
          amount: '100',
          asset: 'XLM',
          actor: 'GABC123',
          txHash: 'abc123',
          label: 'Transaction Confirmed',
          badge: 'Classic',
        },
        {
          id: 'contract-1',
          kind: 'contract' as const,
          createdAt: '2024-01-15T11:00:00Z',
          status: 'indexed',
          amount: '1000',
          asset: 'USDC',
          actor: 'CABC123',
          txHash: 'def456',
          label: 'Transfer Event',
          badge: 'Contract Event',
        },
      ],
      hasMore: false,
      total: 2,
    });

    renderWithProviders(<TransactionHistory />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Classic')).toBeInTheDocument();
    });

    // Verify both badge types are present
    expect(screen.getByText('Classic')).toBeInTheDocument();
    expect(screen.getByText('Contract Event')).toBeInTheDocument();

    // Verify they are different
    const classicBadge = screen.getByText('Classic');
    const contractBadge = screen.getByText('Contract Event');
    expect(classicBadge.textContent).not.toBe(contractBadge.textContent);
  });
});
