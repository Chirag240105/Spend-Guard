import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AuthService } from '@/src/modules/auth/auth.service';
import { getPaymentById } from '@/src/modules/payments/payment.query';

type PageProps = { params: Promise<{ id: string }> };

const dateTime = (value: Date | null | undefined) =>
  value ? value.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available';

const money = (amount: number | string, currency: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    Number(amount),
  );

const statusStyle = (status: string) => {
  if (['SUCCESS', 'APPROVED'].includes(status)) return { bg: '#dcfce7', color: '#15803d' };
  if (['FAILED', 'REJECTED', 'DO_NOT_RETRY'].includes(status)) return { bg: '#fee2e2', color: '#b91c1c' };
  if (['HUMAN_REVIEW', 'RECOVERY_PENDING'].includes(status)) return { bg: '#fef9c3', color: '#92400e' };
  return { bg: '#eff6ff', color: '#1d4ed8' };
};

function StatusBadge({ status }: { status: string }) {
  const style = statusStyle(status);
  return (
    <span style={{ background: style.bg, color: style.color, borderRadius: 99, padding: '5px 10px', fontSize: 11, fontWeight: 800, letterSpacing: '.05em' }}>
      {status}
    </span>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, padding: '11px 0', borderBottom: '1px solid var(--line-2)' }}>
      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{label}</span>
      <span className={mono ? 'mono' : undefined} style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 600, textAlign: 'right', overflowWrap: 'anywhere' }}>
        {value}
      </span>
    </div>
  );
}

export default async function PaymentDetailPage({ params }: PageProps) {
  const token = (await cookies()).get(AuthService.cookieName)?.value;
  if (!token) redirect('/login');

  try {
    const auth = AuthService.verifyToken(token);
    if (!(await AuthService.getMe(auth.sub))) redirect('/login');
  } catch {
    redirect('/login');
  }

  const { id } = await params;
  const payment = await getPaymentById(id);
  if (!payment) notFound();

  const currency = payment.order.currency;
  const latestDecision = payment.agentDecisions[0];
  const decisionOutput = latestDecision?.output;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1120 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link href="/payments" className="ghost-button" style={{ padding: '0 0 12px', textDecoration: 'none' }}>← Back to payments</Link>
          <p className="eyebrow" style={{ margin: '4px 0 6px' }}>Payment detail</p>
          <h1 style={{ color: 'var(--ink)', fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', margin: 0 }}>Payment pipeline record</h1>
          <p className="mono" style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6, overflowWrap: 'anywhere' }}>{payment.id}</p>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      <section className="surface" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, padding: 20 }}>
        <div><p className="eyebrow" style={{ margin: 0 }}>Amount</p><p style={{ color: 'var(--ink)', fontSize: 24, fontWeight: 800, margin: '5px 0 0' }}>{money(String(payment.order.amount), currency)}</p></div>
        <div><p className="eyebrow" style={{ margin: 0 }}>Provider</p><p style={{ color: 'var(--ink)', fontSize: 17, fontWeight: 700, margin: '9px 0 0', textTransform: 'capitalize' }}>{payment.provider}</p></div>
        <div><p className="eyebrow" style={{ margin: 0 }}>Checkout</p><p style={{ color: 'var(--ink)', fontSize: 17, fontWeight: 700, margin: '9px 0 0' }}>{payment.checkoutStatus}</p></div>
        <div><p className="eyebrow" style={{ margin: 0 }}>Attempts</p><p style={{ color: 'var(--ink)', fontSize: 17, fontWeight: 700, margin: '9px 0 0' }}>{payment.attempts.length} <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 500 }}>({payment.retryCount} retries)</span></p></div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <section className="surface" style={{ padding: 20 }}>
          <h2 style={{ color: 'var(--ink)', fontSize: 15, fontWeight: 800, margin: '0 0 5px' }}>Payment information</h2>
          <DetailRow label="Payment ID" value={payment.id} mono />
          <DetailRow label="Order ID" value={payment.orderId} mono />
          <DetailRow label="Currency" value={currency} />
          <DetailRow label="Created" value={dateTime(payment.createdAt)} />
          <DetailRow label="Updated" value={dateTime(payment.updatedAt)} />
          <DetailRow label="Verified" value={dateTime(payment.verifiedAt)} />
        </section>

        <section className="surface" style={{ padding: 20 }}>
          <h2 style={{ color: 'var(--ink)', fontSize: 15, fontWeight: 800, margin: '0 0 5px' }}>Gateway and checkout</h2>
          <DetailRow label="Razorpay order ID" value={payment.razorpayOrderId ?? 'Not available'} mono />
          <DetailRow label="Razorpay payment ID" value={payment.razorpayPaymentId ?? 'Not available'} mono />
          <DetailRow label="Gateway payment ID" value={payment.gatewayPaymentId ?? 'Not available'} mono />
          <DetailRow label="Signature" value={payment.razorpaySignature ? 'Present' : 'Not available'} />
          <DetailRow label="Checkout status" value={payment.checkoutStatus} />
          <DetailRow label="Failure reason" value={payment.failureReason ?? 'None recorded'} />
        </section>
      </div>

      <section className="surface" style={{ padding: 20 }}>
        <h2 style={{ color: 'var(--ink)', fontSize: 15, fontWeight: 800, margin: '0 0 14px' }}>Attempts and recovery history</h2>
        {payment.attempts.length ? payment.attempts.map((attempt) => (
          <div key={attempt.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '12px 0', borderTop: '1px solid var(--line-2)' }}>
            <div><strong style={{ color: 'var(--ink)', fontSize: 13 }}>Attempt {attempt.attemptNumber}</strong><p style={{ color: 'var(--muted)', fontSize: 12, margin: '3px 0 0' }}>{dateTime(attempt.createdAt)}</p></div>
            <div style={{ textAlign: 'right' }}><StatusBadge status={attempt.outcome} /><p className="mono" style={{ color: 'var(--muted)', fontSize: 11, margin: '5px 0 0' }}>{attempt.gatewayErrorCode ?? 'No gateway error'}</p></div>
          </div>
        )) : <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No payment attempts recorded.</p>}
      </section>

      {latestDecision && (
        <section className="surface" style={{ padding: 20 }}>
          <h2 style={{ color: 'var(--ink)', fontSize: 15, fontWeight: 800, margin: '0 0 14px' }}>AI decision and recovery</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
            <DetailRow label="Policy action" value={latestDecision.policyAction} />
            <DetailRow label="Decision created" value={dateTime(latestDecision.createdAt)} />
            <DetailRow label="Approval" value={latestDecision.approval?.status ?? 'No approval'} />
          </div>
          <pre style={{ background: 'var(--canvas)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink-2)', fontSize: 11, lineHeight: 1.6, margin: 0, overflowX: 'auto', padding: 14, whiteSpace: 'pre-wrap' }}>{JSON.stringify(decisionOutput, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
