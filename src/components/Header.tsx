import React from 'react';
import {
  FileText,
  Mail,
  Building2,
  PlusCircle,
  TrendingUp,
  Server,
  LogOut,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface HeaderProps {
  user: any;
  accessToken: string | null;
  needsAuth: boolean;
  activeView: 'list' | 'analytics' | 'create' | 'edit' | 'preview';
  onSelectView: (view: 'list' | 'analytics') => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenNewQuote: () => void;
  onOpenCompanyProfile: () => void;
  onOpenEmailChecker: () => void;
  onOpenPiGuide: () => void;
  pendingPOCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  accessToken,
  needsAuth,
  activeView,
  onSelectView,
  onLogin,
  onLogout,
  onOpenNewQuote,
  onOpenCompanyProfile,
  onOpenEmailChecker,
  onOpenPiGuide,
  pendingPOCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Navigation Tabs */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => onSelectView('list')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-indigo-600 group-hover:bg-indigo-700 rounded flex items-center justify-center shrink-0 shadow-xs transition">
              <div className="w-4 h-4 border-2 border-white rotate-45"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-slate-900 tracking-tight">
                  QuoteXpress <span className="text-indigo-600">Pro</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Nav Views Selector */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => onSelectView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeView === 'list' || activeView === 'create' || activeView === 'edit' || activeView === 'preview'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents</span>
            </button>

            <button
              onClick={() => onSelectView('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeView === 'analytics'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Analytics & Profit</span>
            </button>
          </nav>
        </div>

        {/* Status Indicators & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Raspberry Pi Self Host Button */}
          <button
            onClick={onOpenPiGuide}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
            title="Deploy on Raspberry Pi & Custom Domain"
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Raspberry Pi</span>
          </button>

          {/* New Quote Button */}
          <button
            onClick={onOpenNewQuote}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg transition shadow-sm shadow-indigo-200 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Quotation</span>
          </button>

          {/* PO Email Checker Button */}
          <button
            onClick={onOpenEmailChecker}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition border ${
              pendingPOCount > 0
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Check Gmail for incoming Purchase Orders"
          >
            <Mail className="w-4 h-4 text-amber-600" />
            <span className="hidden lg:inline">Gmail PO Inbox</span>
            {pendingPOCount > 0 && (
              <span className="bg-amber-500 text-white font-bold text-xs px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-xs">
                {pendingPOCount}
              </span>
            )}
          </button>

          {/* Company Settings */}
          <button
            onClick={onOpenCompanyProfile}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="Company Profile & Bank Info"
          >
            <Building2 className="w-4 h-4" />
          </button>

          {/* User / Google Sign in */}
          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {user && accessToken ? (
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full ring-2 ring-indigo-500/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-3 py-2 rounded-lg transition shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
