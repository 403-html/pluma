import type { OrgSettings } from '@pluma-flags/types';
import { parseErrorMessage } from './utils';

export type OrgSettingsResult =
  | { ok: true; settings: OrgSettings }
  | { ok: false; message: string };

export type PatchOrgSettingsData = {
  allowedDomains?: string[];
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  sendWelcomeEmail?: boolean;
};

const ORG_SETTINGS_URL = '/api/v1/org/settings';

export async function getOrgSettings(): Promise<OrgSettingsResult> {
  try {
    const response = await fetch(ORG_SETTINGS_URL, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to load settings');
      return { ok: false, message };
    }
    const settings: OrgSettings = await response.json();
    return { ok: true, settings };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function patchOrgSettings(data: PatchOrgSettingsData): Promise<OrgSettingsResult> {
  try {
    const response = await fetch(ORG_SETTINGS_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to save settings');
      return { ok: false, message };
    }
    const settings: OrgSettings = await response.json();
    return { ok: true, settings };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}
