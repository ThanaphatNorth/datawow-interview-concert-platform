'use client';

import { useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import styles from './Sidebar.module.css';
import { useAuth } from '@/lib/auth';
import {
  HomeIcon,
  HistoryIcon,
  AdminIcon,
  SwitchIcon,
  LogoutIcon,
  MenuIcon,
} from '@/components/ui/icons';

type View = 'user' | 'admin';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  testId: string;
}

const USER_NAV: NavItem[] = [
  { label: 'Home', href: '/concerts', icon: <HomeIcon />, testId: 'nav-home' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Home', href: '/admin', icon: <HomeIcon />, testId: 'nav-home' },
  { label: 'History', href: '/admin/history', icon: <HistoryIcon />, testId: 'nav-history' },
  {
    label: 'Admin Management',
    href: '/admin/users',
    icon: <AdminIcon />,
    testId: 'nav-admins',
  },
];

export function Sidebar({ view, children }: { view: View; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const title = view === 'admin' ? 'Admin' : 'User';
  const navItems = view === 'admin' ? ADMIN_NAV : USER_NAV;

  const handleRoleSwitch = () => {
    setOpen(false);
    // UI-only toggle (docs/01 §11). Backend stays authoritative; the switch-back
    // gate uses the account `role`, so an admin acting as a user can always return
    // to the admin view.
    if (view === 'user') {
      // Switching to the Admin view: only a real ADMIN account may.
      if (role === 'ADMIN') {
        router.push('/admin');
      } else {
        toast.error("You don't have permission to access the Admin view");
      }
    } else {
      // Switching to the user view: any admin can drop into the user role.
      router.push('/concerts');
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const closeAnd = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <h1 className={styles.title}>{title}</h1>
        <nav className={styles.nav} aria-label="Primary">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                type="button"
                data-testid={item.testId}
                aria-current={active ? 'page' : undefined}
                onClick={closeAnd(() => router.push(item.href))}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            data-testid="role-switch"
            onClick={handleRoleSwitch}
            className={styles.navItem}
          >
            <SwitchIcon />
            {view === 'admin' ? 'Switch to user' : 'Switch to Admin'}
          </button>
        </nav>

        <div className={styles.spacer} />

        <button
          type="button"
          data-testid="logout-btn"
          onClick={handleLogout}
          className={styles.navItem}
        >
          <LogoutIcon />
          Logout
        </button>
      </aside>

      {open && (
        <div
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}

      <div className={styles.content}>
        <div className={styles.topbar}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Open menu"
            data-testid="sidebar-menu-btn"
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </button>
          <span className={styles.topbarTitle}>{title}</span>
        </div>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
