import { LogOut, Shield, User } from "lucide-react";
import { useWalletAuthContext } from "../providers/WalletAuthProvider";
import { Button } from "./ui/Button";

export default function AuthStatus() {
  const { user, isAuthenticated, logout, isLoading } = useWalletAuthContext();

  if (!isAuthenticated || !user) {
    return null;
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4" />
            Authenticated
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {user.walletType.toUpperCase()}: {truncateAddress(user.address)}
          </div>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={logout}
        disabled={isLoading}
        className="h-6 px-2 text-xs gap-1"
      >
        <LogOut className="w-3 h-3" />
        Logout
      </Button>
    </div>
  );
}
