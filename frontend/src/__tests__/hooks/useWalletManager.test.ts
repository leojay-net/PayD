import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, MockedFunction } from 'vitest';
import { useWalletManager } from '../../hooks/useWalletManager';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

vi.mock('@creit.tech/stellar-wallets-kit', () => ({
  StellarWalletsKit: vi.fn(function() { return {}; }),
  WalletNetwork: { TESTNET: 'TESTNET', PUBLIC: 'PUBLIC' },
  FreighterModule: vi.fn(function() { return {}; }),
  xBullModule: vi.fn(function() { return {}; }),
  LobstrModule: vi.fn(function() { return {}; }),
  FREIGHTER_ID: 'freighter',
  LOBSTR_ID: 'lobstr',
}));

vi.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({
    notifyWalletEvent: vi.fn(),
  }),
}));

describe('useWalletManager', () => {
  let mockKitInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockKitInstance = {
      setWallet: vi.fn(),
      getAddress: vi.fn(),
      getSupportedWallets: vi.fn().mockResolvedValue([]),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    };
    (StellarWalletsKit as unknown as ReturnType<typeof vi.fn>).mockImplementation(function() { return mockKitInstance; });
  });

  it('initializes and attempts silent reconnect if wallet in localStorage', async () => {
    localStorage.setItem('payd:last_wallet_name', 'freighter');
    mockKitInstance.getAddress.mockResolvedValue({ address: 'G123' });

    const { result } = renderHook(() => useWalletManager());
    
    // Initially connecting
    expect(result.current.isConnecting).toBe(true);
    expect(result.current.isInitialized).toBe(false);

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(result.current.address).toBe('G123');
    expect(result.current.walletName).toBe('freighter');
    expect(result.current.isConnecting).toBe(false);
  });

  it('handles manual connect sequence appropriately', async () => {
    mockKitInstance.getSupportedWallets.mockResolvedValue([
      { id: 'freighter', name: 'Freighter', isAvailable: true }
    ]);
    
    const { result } = renderHook(() => useWalletManager());

    act(() => {
      result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.walletModalOpen).toBe(true);
    });
    expect(result.current.walletOptions.length).toBe(1);

    mockKitInstance.getAddress.mockResolvedValue({ address: 'G456' });

    act(() => {
      result.current.connectWithWallet('freighter');
    });

    await waitFor(() => {
      expect(result.current.walletModalOpen).toBe(false);
    });
    expect(result.current.address).toBe('G456');
    expect(result.current.walletName).toBe('freighter');
  });

  it('handles disconnect', async () => {
    const { result } = renderHook(() => useWalletManager());

    await act(async () => {
      result.current.disconnect();
    });

    expect(result.current.address).toBeNull();
    expect(result.current.walletName).toBeNull();
    expect(localStorage.getItem('payd:last_wallet_name')).toBeNull();
  });
});
