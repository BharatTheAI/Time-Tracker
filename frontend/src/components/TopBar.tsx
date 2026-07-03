import { useAuth } from "../hooks/useAuth";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { profile, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{profile?.full_name}</p>
          <p className="text-xs text-slate-500">{profile?.employee_code}</p>
        </div>
        <button onClick={() => signOut()} className="btn-secondary">
          Sign out
        </button>
      </div>
    </header>
  );
}
