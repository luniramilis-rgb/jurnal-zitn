import { SUPPORTED_LOCALES, type AppLocale } from '@jurnal-zitn/shared';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/hooks/useLocale';

const LABELS: Record<AppLocale, string> = {
  id: 'Bahasa Indonesia',
  en: 'English',
};

/**
 * Pemilih bahasa antarmuka (ZITN-TECH-017 A0). Preferensi disimpan per pengguna
 * (`PUT /api/users/me/locale`); hanya memengaruhi salinan UI + format angka/tanggal.
 */
export function UILanguageSelect() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="space-y-2">
      <Label htmlFor="ui-language">Bahasa / Language</Label>
      <Select value={locale} onValueChange={(value) => setLocale(value as AppLocale)}>
        <SelectTrigger id="ui-language" className="cursor-pointer">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LOCALES.map((code) => (
            <SelectItem key={code} value={code}>
              {LABELS[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Bahasa antarmuka dan format angka/tanggal. Tidak mengubah data tersimpan.
      </p>
    </div>
  );
}
