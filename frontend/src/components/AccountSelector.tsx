import { useState, useEffect } from 'react';
import { accountsService } from '../services/accountsService';
import type { Account } from '../types/account';

interface AccountSelectorProps {
  value?: string;
  onChange: (accountId: string, account?: Account) => void;
  onlyDetailAccounts?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
}

export const AccountSelector = ({
  value,
  onChange,
  onlyDetailAccounts = true,
  disabled = false,
  placeholder = 'Select account...',
  className = '',
  error,
}: AccountSelectorProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, [onlyDetailAccounts]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = onlyDetailAccounts
        ? await accountsService.getDetailAccounts()
        : (await accountsService.getAccounts({ limit: 1000 })).data;
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(
    (account) =>
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedAccount = accounts.find((a) => a.id === value);

  const handleSelect = (account: Account) => {
    onChange(account.id, account);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          } ${error ? 'border-destructive' : ''}`}
        >
          <span className={selectedAccount ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : placeholder}
          </span>
          <svg
            className="h-4 w-4 opacity-50"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          <div className="mb-2 p-2">
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
            ) : filteredAccounts.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No accounts found</div>
            ) : (
              filteredAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleSelect(account)}
                  className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-accent flex justify-between items-center ${
                    value === account.id ? 'bg-accent' : ''
                  }`}
                >
                  <div>
                    <div className="font-medium">{account.code}</div>
                    <div className="text-muted-foreground">{account.name}</div>
                  </div>
                  <div className="text-xs">
                    <span className={`px-2 py-1 rounded ${
                      account.nature === 'DEBIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {account.nature}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

