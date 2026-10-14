import { useEffect, useState, type FormEvent } from 'react';
import { emailSettings, type EmailDeliveryConfiguration } from '../../services/api';
import { FormField, inputCls } from '../../components/ui/Toast';

const DEFAULTS: EmailDeliveryConfiguration = {
  enabled: false, host: '', port: 587, encryption: 'tls', username: '',
  from_address: '', from_name: 'WiWaste', password_configured: false,
};

export function EmailDeliverySettings() {
  const [config, setConfig] = useState(DEFAULTS);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    emailSettings.get().then(data => { if (mounted) setConfig(data); })
      .catch(err => { if (mounted) setError(err instanceof Error ? err.message : 'Could not load email settings.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const { password_configured: _configured, ...fields } = config;
      const result = await emailSettings.update({ ...fields, ...(password ? { password } : {}) });
      setConfig(result);
      setPassword('');
      setMessage('Email delivery settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save email settings.');
    } finally { setSaving(false); }
  }

  function change<K extends keyof EmailDeliveryConfiguration>(key: K, value: EmailDeliveryConfiguration[K]) {
    setConfig(previous => ({ ...previous, [key]: value }));
  }

  return (
    <section aria-labelledby="email-delivery-title" className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <h2 id="email-delivery-title" className="text-sm font-bold text-slate-800 dark:text-slate-100">Email Delivery</h2>
        <p className="mt-1 text-xs text-slate-500">Send login alerts, account lockout notices, and password reset codes to registered email addresses.</p>
      </div>
      <form onSubmit={save} className="space-y-4 p-4">
        {loading ? <p className="text-xs text-slate-500">Loading email settings…</p> : <>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input type="checkbox" checked={config.enabled} onChange={e => change('enabled', e.target.checked)} />
            Use this SMTP server for account emails
          </label>
          {!config.enabled && <p className="text-xs text-slate-500">Email delivery currently uses the server’s default configuration. Enable and configure SMTP to deliver to inboxes.</p>}
          <fieldset disabled={saving || !config.enabled} className="grid grid-cols-1 gap-3 disabled:opacity-60 sm:grid-cols-2">
            <FormField label="SMTP Host" htmlFor="smtp-host"><input id="smtp-host" required={config.enabled} maxLength={255} value={config.host} onChange={e => change('host', e.target.value)} placeholder="smtp.example.com" className={inputCls} /></FormField>
            <FormField label="SMTP Port" htmlFor="smtp-port"><input id="smtp-port" type="number" required={config.enabled} min={1} max={65535} value={config.port} onChange={e => change('port', Number(e.target.value))} className={inputCls} /></FormField>
            <FormField label="Connection Security" htmlFor="smtp-encryption"><select id="smtp-encryption" value={config.encryption} onChange={e => change('encryption', e.target.value as EmailDeliveryConfiguration['encryption'])} className={inputCls}><option value="tls">STARTTLS (usually port 587)</option><option value="ssl">TLS (usually port 465)</option><option value="none">None (local mail server)</option></select></FormField>
            <FormField label="SMTP Username" htmlFor="smtp-username"><input id="smtp-username" maxLength={255} autoComplete="off" value={config.username} onChange={e => change('username', e.target.value)} className={inputCls} /></FormField>
            <FormField label="SMTP Password" htmlFor="smtp-password"><input id="smtp-password" type="password" maxLength={1024} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder={config.password_configured ? 'Saved securely; leave blank to keep' : 'Enter your email provider password'} className={inputCls} /></FormField>
            <FormField label="Sender Email" htmlFor="smtp-from"><input id="smtp-from" type="email" required={config.enabled} maxLength={100} value={config.from_address} onChange={e => change('from_address', e.target.value)} placeholder="notifications@example.com" className={inputCls} /></FormField>
            <FormField label="Sender Name" htmlFor="smtp-name"><input id="smtp-name" maxLength={100} value={config.from_name} onChange={e => change('from_name', e.target.value)} className={inputCls} /></FormField>
          </fieldset>
          <button type="submit" disabled={saving} className="h-9 rounded-lg bg-brand px-4 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60">{saving ? 'Saving…' : 'Save Email Settings'}</button>
        </>}
        {message && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">{message}</p>}
        {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </section>
  );
}
