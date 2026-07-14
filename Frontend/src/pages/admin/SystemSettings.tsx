import React, { useState } from 'react';
import { Save, Download, Trash2, Upload, Loader2, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Toast, useToast, FormField, inputCls } from '../../components/ui/Toast';

/* ── Toggle Switch ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:ring-offset-2 dark:focus:ring-offset-slate-950 ${
        checked ? 'bg-[#006a61]' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ── Section Card ── */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ── Alert Row ── */
function AlertRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 dark:border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export function SystemSettings() {
  const { toasts, dismiss, success, error } = useToast();

  /* ── Store Profile ── */
  const [profile, setProfile] = useState({
    storeName: 'WiWaste Store',
    storeEmail: 'owner@wiwaste.com',
    storePhone: '(02) 8123 4567',
    storeAddress: '123 Eco Street, Quezon City, Metro Manila',
    currency: 'PHP',
    timezone: 'Asia/Manila',
  });
  const [saveLoading, setSaveLoading] = useState(false);

  /* ── Smart Alerts ── */
  const [alerts, setAlerts] = useState({
    expiryAlerts: true,
    lowStockAlerts: true,
    wasteThreshold: true,
    supplierDelay: false,
    dailyDigest: true,
    criticalAlerts: true,
  });

  const setAlert = (key: keyof typeof alerts) => (v: boolean) =>
    setAlerts(prev => ({ ...prev, [key]: v }));

  /* ── Data Management ── */
  const [exportLoading, setExportLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);

  /* ── Handlers ── */
  const handleSaveConfig = async () => {
    if (!profile.storeName.trim() || !profile.storeEmail.trim()) {
      error('Store name and email are required.');
      return;
    }
    setSaveLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaveLoading(false);
    success('System configuration saved successfully.');
  };

  const handleExport = async () => {
    setExportLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setExportLoading(false);
    success('Data exported successfully. Check your downloads folder.');
  };

  const handleDownloadLogs = async () => {
    setDownloadLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setDownloadLoading(false);
    success('System logs downloaded successfully.');
  };

  const handlePurge = async () => {
    setPurgeLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setPurgeLoading(false);
    success('Old waste records purged successfully.');
  };

  return (
    <div className="space-y-6 w-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">System Settings</h1>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Configure your store profile, alert preferences and data management options.
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
        <button
          onClick={handleSaveConfig}
          disabled={saveLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {saveLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Config
            </>
          )}
        </button>
      </div>

      {/* ── Store Profile ── */}
      <SectionCard title="Store Profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Store Name">
            <input
              type="text"
              value={profile.storeName}
              onChange={e => setProfile(p => ({ ...p, storeName: e.target.value }))}
              className={inputCls}
              placeholder="WiWaste Store"
            />
          </FormField>
          <FormField label="Store Email">
            <input
              type="email"
              value={profile.storeEmail}
              onChange={e => setProfile(p => ({ ...p, storeEmail: e.target.value }))}
              className={inputCls}
              placeholder="owner@wiwaste.com"
            />
          </FormField>
          <FormField label="Phone Number">
            <input
              type="tel"
              value={profile.storePhone}
              onChange={e => setProfile(p => ({ ...p, storePhone: e.target.value }))}
              className={inputCls}
              placeholder="(02) 8123 4567"
            />
          </FormField>
          <FormField label="Address">
            <input
              type="text"
              value={profile.storeAddress}
              onChange={e => setProfile(p => ({ ...p, storeAddress: e.target.value }))}
              className={inputCls}
              placeholder="123 Eco Street, Quezon City"
            />
          </FormField>
          <FormField label="Currency">
            <select
              value={profile.currency}
              onChange={e => setProfile(p => ({ ...p, currency: e.target.value }))}
              className={inputCls}
            >
              <option value="PHP">PHP — Philippine Peso</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="SGD">SGD — Singapore Dollar</option>
            </select>
          </FormField>
          <FormField label="Timezone">
            <select
              value={profile.timezone}
              onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
              className={inputCls}
            >
              <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
              <option value="UTC">UTC (UTC+0)</option>
            </select>
          </FormField>
        </div>
      </SectionCard>

      {/* ── Smart Alerts ── */}
      <SectionCard title="Smart Alerts">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Enable or disable automated notifications sent to Owner/Administrators.
        </p>
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          <AlertRow
            label="Expiry Alerts"
            description="Notify when products are approaching their expiry date (within 3 days)."
            checked={alerts.expiryAlerts}
            onChange={setAlert('expiryAlerts')}
          />
          <AlertRow
            label="Low Stock Alerts"
            description="Alert when any product falls below its minimum stock threshold."
            checked={alerts.lowStockAlerts}
            onChange={setAlert('lowStockAlerts')}
          />
          <AlertRow
            label="Waste Threshold Alerts"
            description="Trigger a warning when daily waste exceeds the configured limit."
            checked={alerts.wasteThreshold}
            onChange={setAlert('wasteThreshold')}
          />
          <AlertRow
            label="Supplier Delay Alerts"
            description="Notify when an expected supplier delivery is overdue."
            checked={alerts.supplierDelay}
            onChange={setAlert('supplierDelay')}
          />
          <AlertRow
            label="Daily Digest"
            description="Send a daily summary of all waste, stock and activity at end of day."
            checked={alerts.dailyDigest}
            onChange={setAlert('dailyDigest')}
          />
          <AlertRow
            label="Critical System Alerts"
            description="Always-on alerts for critical system events and data anomalies."
            checked={alerts.criticalAlerts}
            onChange={setAlert('criticalAlerts')}
          />
        </div>
      </SectionCard>

      {/* ── Data Management ── */}
      <SectionCard title="Data Management">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Manage your inventory and waste data. These actions are irreversible — proceed with caution.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Export Data */}
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {exportLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Export Data
              </>
            )}
          </button>

          {/* Download Logs */}
          <button
            onClick={handleDownloadLogs}
            disabled={downloadLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {downloadLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Logs
              </>
            )}
          </button>

          {/* Purge Old Records */}
          <button
            onClick={handlePurge}
            disabled={purgeLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {purgeLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Purging…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Purge Old Records
              </>
            )}
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-4 py-3 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <span className="font-bold">Warning:</span> Purging old records permanently removes waste logs older than 90 days. This action cannot be undone.
        </div>
      </SectionCard>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
