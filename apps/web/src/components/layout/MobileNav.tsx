import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';

/**
 * MobileNav — ZITN-TECH-070 (opsi nav mobile). Di bawah `md` rail sidebar
 * disembunyikan (lihat `Sidebar` `mode="rail"`), dan navigasi pindah ke overlay
 * kiri ini: tombol menu (hamburger) + panel yang memuat ulang `<Sidebar mode="drawer" />`
 * sehingga seluruh tautan **dan** footer (tema/keluar) tetap tersedia di ponsel.
 *
 * A11y: panel = dialog modal (Escape/backdrop menutup, fokus pindah ke tombol tutup,
 * scroll body dikunci saat terbuka). Hanya dirender di bawah `md`.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="cursor-pointer md:hidden max-md:size-11"
        aria-label="Buka menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        data-testid="mobile-nav-toggle"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" data-testid="mobile-nav">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 cursor-pointer bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi"
            className="absolute inset-y-0 left-0 flex w-[80%] max-w-xs flex-col border-r bg-card shadow-xl"
          >
            <div className="flex justify-end p-1">
              <Button
                ref={closeRef}
                variant="ghost"
                size="icon-sm"
                className="cursor-pointer max-md:size-11"
                aria-label="Tutup menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
            <div
              className="min-h-0 flex-1"
              // The shell persists across routes, so navigating does not unmount
              // this overlay — close it when a nav link inside is clicked.
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a')) setOpen(false);
              }}
            >
              <Sidebar mode="drawer" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileNav;
