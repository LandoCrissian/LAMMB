'use client';
import { useEffect, useState } from 'react';

type Provider = {
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, callback: () => void): void;
  removeListener?(event: string, callback: () => void): void;
};
type Status = {
  address: string;
  founder: boolean;
  wl: string;
  wlAllowance: number;
  gtdAllowance: number;
};
async function api(action: string, input?: unknown) {
  const response = await fetch('/api/genesis/' + action, {
    method: input === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    ...(input === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'REGISTRATION_UNAVAILABLE');
  return result;
}
async function signIn(purpose: 'collector' | 'admin') {
  const provider = (window as Window & { ethereum?: Provider }).ethereum;
  if (!provider)
    throw new Error(
      'A compatible Ethereum wallet extension is required. Never enter a seed phrase here.',
    );
  const addresses = (await provider.request({
    method: 'eth_requestAccounts',
  })) as string[];
  const address = addresses[0];
  if (!address) throw new Error('No wallet selected.');
  const c = await api('challenge', { address, purpose });
  const hex =
    '0x' +
    [...new TextEncoder().encode(c.message)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  const signature = await provider.request({
    method: 'personal_sign',
    params: [hex, address],
  });
  const current = (await provider.request({
    method: 'eth_accounts',
  })) as string[];
  if (current[0]?.toLowerCase() !== address.toLowerCase())
    throw new Error('Wallet changed. Please verify again.');
  await api('verify', { id: c.id, signature });
}
const humanError = (error: unknown) =>
  error instanceof Error
    ? error.message.replaceAll('_', ' ').toLowerCase()
    : 'Unable to complete request.';

function useWalletSessionReset(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const provider = (window as Window & { ethereum?: Provider }).ethereum;
    if (!provider?.on || !provider.removeListener) return;
    const reset = () => {
      void api('logout', {})
        .finally(() => window.location.reload())
        .catch(() => {});
    };
    provider.on('accountsChanged', reset);
    provider.on('disconnect', reset);
    return () => {
      provider.removeListener?.('accountsChanged', reset);
      provider.removeListener?.('disconnect', reset);
    };
  }, [active]);
}

export function GenesisRegistration() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [notice, setNotice] = useState(
    'Registration is not open. No applications are being collected.',
  );
  const [consent, setConsent] = useState(false);
  useWalletSessionReset(status !== null);
  useEffect(() => {
    let active = true;
    void api('config')
      .then(async (c) => {
        if (!active) return;
        setEnabled(c.registrationEnabled);
        if (c.registrationEnabled) {
          setNotice(
            'Verify wallet ownership to check your private status or apply for WL consideration.',
          );
          try {
            const s = await api('status');
            if (active) setStatus(s);
          } catch {
            /* Signed out. */
          }
        }
      })
      .catch(() => {
        /* Keep closed. */
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch (error) {
      setNotice(humanError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="genesis-registration"
      aria-labelledby="registration-title"
    >
      <div>
        <p className="section-kicker">YOUR WALLET. YOUR STATUS.</p>
        <h2 id="registration-title">Get on the radar.</h2>
        <p>
          GTD eligibility is reviewed privately. WL applications are requests
          for consideration. Neither a signature nor an application reserves an
          NFT.
        </p>
        <p id="genesis-privacy">
          We store your wallet address, verification time, application status
          and approval evidence. No email or social profile is required. Login
          challenges expire in 5 minutes; sessions in 30 minutes. Application
          records without approval expire after 90 days without wallet
          verification. Approved allocations remain private for the launch
          eligibility audit. Never share private keys or seed phrases.
        </p>
      </div>
      <div className="genesis-status">
        <span className="genesis-tag">
          {enabled ? 'APPLICATIONS ENABLED' : 'REGISTRATION CLOSED'}
        </span>
        <p role="status" aria-live="polite">
          {notice}
        </p>
        {status ? (
          <>
            <p className="genesis-wallet" title={status.address}>
              Verified wallet: {status.address.slice(0, 6)}…
              {status.address.slice(-4)}
            </p>
            <dl>
              <div>
                <dt>Founder</dt>
                <dd>
                  {status.founder
                    ? 'Private Stage 1 allocation'
                    : 'Not assigned'}
                </dd>
              </div>
              <div>
                <dt>GTD allowance</dt>
                <dd>{status.gtdAllowance || 'Not approved'}</dd>
              </div>
              <div>
                <dt>WL application</dt>
                <dd>{status.wl.replaceAll('_', ' ')}</dd>
              </div>
              <div>
                <dt>WL allowance</dt>
                <dd>{status.wlAllowance || 'Not approved'}</dd>
              </div>
            </dl>
            {!status.founder && status.wl === 'NOT_APPLIED' ? (
              <>
                <label className="genesis-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    aria-describedby="genesis-privacy"
                  />{' '}
                  I understand the privacy notice and that applying does not
                  guarantee access.
                </label>
                <button
                  className="genesis-button"
                  disabled={!enabled || busy || !consent}
                  onClick={() =>
                    void run(async () => {
                      await api('apply', { consent: true });
                      setStatus(await api('status'));
                      setNotice(
                        'WL application submitted for review. No mint is reserved.',
                      );
                    })
                  }
                >
                  Submit WL application
                </button>
              </>
            ) : null}
            <button
              className="genesis-text-button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api('logout', {});
                  setStatus(null);
                  setConsent(false);
                  setNotice('Signed out. Your session has been revoked.');
                })
              }
            >
              Sign out
            </button>
          </>
        ) : (
          <button
            className="genesis-button"
            disabled={!enabled || busy}
            onClick={() =>
              void run(async () => {
                await signIn('collector');
                setStatus(await api('status'));
                setNotice(
                  'Wallet verified. Signing did not mint or approve spending.',
                );
              })
            }
          >
            {busy ? 'Checking…' : 'Verify wallet & check status'}
          </button>
        )}
        <small>
          Ownership verification uses a one-time message signature. Minting
          happens on OpenSea only.
        </small>
      </div>
    </section>
  );
}

type RecordRow = {
  address: string;
  wl: string;
  wlUnits: number;
  grants: { units: number }[];
  founderEvidence: string | null;
};
export function GenesisAdmin() {
  const [enabled, setEnabled] = useState(false);
  const [records, setRecords] = useState<RecordRow[] | null>(null);
  const [privateVerified, setPrivateVerified] = useState(false);
  const [notice, setNotice] = useState(
    'Administrator access is disabled until separately configured and approved.',
  );
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [action, setAction] = useState('WL_APPROVE');
  const [proof, setProof] = useState('');
  const [units, setUnits] = useState(1);
  const [grantKey, setGrantKey] = useState('');
  const [kind, setKind] = useState('INVITATION');
  useWalletSessionReset(records !== null || privateVerified);
  useEffect(() => {
    void api('config')
      .then((c) => setEnabled(c.adminEnabled))
      .catch(() => {});
  }, []);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      setNotice(humanError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="genesis-admin">
      <h1>Genesis administration</h1>
      <p>
        Private records. Verify ownership and evidence before approving any
        allowance. No activation, mint or transaction controls are available
        here.
      </p>
      <p role="status" aria-live="polite">
        {notice}
      </p>
      <button
        className="genesis-button"
        disabled={!enabled || busy}
        onClick={() =>
          void run(async () => {
            await signIn('admin');
            setPrivateVerified(false);
            setRecords((await api('admin-records')).records);
            setNotice(
              'Administrator verified. Private session expires in 15 minutes.',
            );
          })
        }
      >
        Verify administrator wallet
      </button>
      <p>
        Owner-nominated founder or invitation wallet? Prove control privately
        without administrator privileges or a public WL application.
      </p>
      <button
        className="genesis-button"
        disabled={!enabled || busy}
        onClick={() =>
          void run(async () => {
            await signIn('collector');
            await api('status');
            setRecords(null);
            setPrivateVerified(true);
            setNotice(
              'Wallet control verified privately. An administrator must separately review allocation evidence. This did not grant administrator access or mint an NFT.',
            );
          })
        }
      >
        Verify private invitation wallet
      </button>
      {privateVerified ? (
        <button
          className="genesis-text-button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await api('logout', {});
              setPrivateVerified(false);
              setNotice('Signed out.');
            })
          }
        >
          Sign out private wallet
        </button>
      ) : null}
      {records ? (
        <>
          <div className="genesis-admin-form">
            <label>
              Verified wallet
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Choose a wallet</option>
                {records.map((r) => (
                  <option key={r.address} value={r.address}>
                    {r.address} · WL {r.wl} · GTD{' '}
                    {r.grants.reduce((n, g) => n + g.units, 0)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Decision
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="WL_APPROVE">Approve WL application</option>
                <option value="WL_REJECT">Reject WL application</option>
                <option value="GTD_GRANT">Approve GTD entitlement</option>
                <option value="GTD_REVOKE">Revoke GTD entitlement</option>
                <option value="FOUNDER">
                  Assign verified founder (Stage 1 only)
                </option>
              </select>
            </label>
            <label>
              Evidence digest
              <input
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder="sha256:…"
                autoComplete="off"
              />
            </label>
            {['WL_APPROVE', 'GTD_GRANT'].includes(action) ? (
              <label>
                Allowance
                <input
                  type="number"
                  min={1}
                  max={action === 'WL_APPROVE' ? 2 : 5}
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                />
              </label>
            ) : null}
            {action.startsWith('GTD') ? (
              <label>
                Unique project or invitation key
                <input
                  value={grantKey}
                  onChange={(e) => setGrantKey(e.target.value)}
                  autoComplete="off"
                />
              </label>
            ) : null}
            {action === 'GTD_GRANT' ? (
              <label>
                Evidence type
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="INVITATION">
                    Individually approved invitation
                  </option>
                  <option value="PARTNER">
                    Owner-approved partner snapshot (1 entitlement)
                  </option>
                </select>
              </label>
            ) : null}
            <button
              className="genesis-button"
              disabled={busy || !target || !/^sha256:[a-f0-9]{64}$/.test(proof)}
              onClick={() =>
                void run(async () => {
                  await api('admin-decision', {
                    address: target,
                    action,
                    evidence: proof,
                    ...(['WL_APPROVE', 'GTD_GRANT'].includes(action)
                      ? { units }
                      : {}),
                    ...(action.startsWith('GTD') ? { key: grantKey } : {}),
                    ...(action === 'GTD_GRANT' ? { kind } : {}),
                  });
                  setRecords((await api('admin-records')).records);
                  setNotice(
                    'Decision recorded with evidence. No OpenSea upload or mint occurred.',
                  );
                })
              }
            >
              Record reviewed decision
            </button>
          </div>
          <h2>Private OpenSea exports</h2>
          <p>
            Headerless address, allowance, zero price. Budgets are checked
            transactionally. These files do not configure OpenSea supply caps.
            Never publish wallet lists.
          </p>
          <div className="genesis-admin-exports">
            {(['FOUNDER', 'GTD', 'WL'] as const).map((stage) => (
              <button
                key={stage}
                className="genesis-button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const res = await fetch('/api/genesis/export', {
                      method: 'POST',
                      credentials: 'same-origin',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ stage }),
                    });
                    if (!res.ok) throw new Error((await res.json()).error);
                    const blob = await res.blob(),
                      url = URL.createObjectURL(blob),
                      link = document.createElement('a');
                    link.href = url;
                    link.download =
                      'lammb-' + stage.toLowerCase() + '-allowlist.csv';
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    setNotice(
                      stage +
                        ' export: ' +
                        res.headers.get('X-Allowlist-Rows') +
                        ' wallets; SHA-256 ' +
                        res.headers.get('X-Content-SHA256'),
                    );
                  })
                }
              >
                Export {stage}
              </button>
            ))}
          </div>
          <button
            className="genesis-text-button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await api('logout', {});
                setRecords(null);
                setNotice('Signed out.');
              })
            }
          >
            Sign out administrator
          </button>
        </>
      ) : null}
    </section>
  );
}
