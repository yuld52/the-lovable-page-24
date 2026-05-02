import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "Meteorfy <onboarding@resend.dev>";

const BRAND = {
  purple: "#7c3aed",
  dark: "#09090b",
  card: "#18181b",
  border: "#27272a",
  text: "#ffffff",
  muted: "#a1a1aa",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
};

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.dark};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.dark};padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="padding-bottom:24px;text-align:center;">
            <span style="font-size:22px;font-weight:900;color:${BRAND.purple};letter-spacing:-0.5px;">Meteor<span style="color:${BRAND.text}">fy</span></span>
          </td>
        </tr>
        <!-- Card -->
        <tr>
          <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding-top:20px;text-align:center;">
            <p style="margin:0;font-size:11px;color:${BRAND.muted};">© ${new Date().getFullYear()} Meteorfy · Este email foi gerado automaticamente.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function divider(): string {
  return `<tr><td style="padding:16px 0;"><hr style="border:none;border-top:1px solid ${BRAND.border};margin:0;"/></td></tr>`;
}

function row(label: string, value: string, valueColor = BRAND.text): string {
  return `<tr>
    <td style="padding:6px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:${BRAND.muted};">${label}</td>
          <td style="font-size:13px;font-weight:600;color:${valueColor};text-align:right;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─────────────────────────────────────────────────────────────
// 1. BUYER — Sale Confirmation
// ─────────────────────────────────────────────────────────────
export async function sendBuyerConfirmation(opts: {
  to: string;
  productName: string;
  amount: string;
  orderId: string;
  paymentMethod: string;
}) {
  const { to, productName, amount, orderId, paymentMethod } = opts;
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${BRAND.green}1a;border-radius:50%;margin-bottom:12px;">
            <span style="font-size:28px;">✅</span>
          </div>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${BRAND.text};">Pagamento confirmado!</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};">O seu pedido foi aprovado com sucesso.</p>
        </td>
      </tr>
      ${divider()}
      <tr><td style="padding:16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Produto", productName)}
          ${row("Valor pago", amount, BRAND.green)}
          ${row("Método", paymentMethod)}
          ${row("ID do pedido", `#${orderId}`, BRAND.muted)}
        </table>
      </td></tr>
      ${divider()}
      <tr>
        <td style="padding-top:16px;font-size:13px;color:${BRAND.muted};line-height:1.6;">
          Obrigado pela sua compra. Se tiver alguma dúvida, entre em contacto com o suporte.
        </td>
      </tr>
    </table>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `✅ Compra confirmada — ${productName}`,
    html: baseLayout("Compra Confirmada", body),
  });
}

// ─────────────────────────────────────────────────────────────
// 2. SELLER — New Sale Notification
// ─────────────────────────────────────────────────────────────
export async function sendSellerNewSale(opts: {
  to: string;
  productName: string;
  amount: string;
  buyerEmail: string;
  orderId: string;
  paymentMethod: string;
}) {
  const { to, productName, amount, buyerEmail, orderId, paymentMethod } = opts;
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <div style="display:inline-block;padding:10px 20px;background:${BRAND.purple}22;border:1px solid ${BRAND.purple}44;border-radius:100px;margin-bottom:16px;">
            <span style="font-size:12px;font-weight:700;color:${BRAND.purple};letter-spacing:1px;text-transform:uppercase;">💰 Nova Venda</span>
          </div>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${BRAND.text};">Você recebeu uma venda!</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};">Um novo cliente adquiriu o seu produto.</p>
        </td>
      </tr>
      ${divider()}
      <tr><td style="padding:16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Produto", productName)}
          ${row("Valor recebido", amount, BRAND.green)}
          ${row("Comprador", buyerEmail)}
          ${row("Método", paymentMethod)}
          ${row("ID do pedido", `#${orderId}`, BRAND.muted)}
        </table>
      </td></tr>
      ${divider()}
      <tr>
        <td style="padding-top:20px;text-align:center;">
          <a href="https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "meteorfy.com"}/sales"
             style="display:inline-block;background:${BRAND.purple};color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;">
            Ver Vendas →
          </a>
        </td>
      </tr>
    </table>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `💰 Nova venda — ${productName} (${amount})`,
    html: baseLayout("Nova Venda", body),
  });
}

// ─────────────────────────────────────────────────────────────
// 3. SELLER — Withdrawal Status Update
// ─────────────────────────────────────────────────────────────
export async function sendWithdrawalUpdate(opts: {
  to: string;
  status: "approved" | "rejected";
  amount: string;
  method: string;
  pixKey: string;
  adminNote?: string;
  withdrawalId: number;
}) {
  const { to, status, amount, method, pixKey, adminNote, withdrawalId } = opts;
  const approved = status === "approved";

  const iconBg = approved ? BRAND.green : BRAND.red;
  const icon = approved ? "✅" : "❌";
  const title = approved ? "Saque aprovado!" : "Saque recusado";
  const subtitle = approved
    ? "O seu saque foi processado e enviado com sucesso."
    : "O seu pedido de saque não foi aprovado.";
  const statusLabel = approved ? "Aprovado" : "Recusado";
  const statusColor = approved ? BRAND.green : BRAND.red;

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${iconBg}1a;border-radius:50%;margin-bottom:12px;">
            <span style="font-size:28px;">${icon}</span>
          </div>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${BRAND.text};">${title}</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};">${subtitle}</p>
        </td>
      </tr>
      ${divider()}
      <tr><td style="padding:16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Valor", amount, statusColor)}
          ${row("Método", method)}
          ${row("Conta", pixKey)}
          ${row("Status", statusLabel, statusColor)}
          ${row("ID do saque", `#${withdrawalId}`, BRAND.muted)}
        </table>
      </td></tr>
      ${adminNote ? `${divider()}
      <tr><td style="padding-top:16px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${BRAND.muted};text-transform:uppercase;letter-spacing:1px;">Nota do Admin</p>
        <p style="margin:0;font-size:13px;color:${BRAND.text};background:#27272a;padding:12px 14px;border-radius:8px;">${adminNote}</p>
      </td></tr>` : ""}
      ${divider()}
      <tr>
        <td style="padding-top:16px;font-size:13px;color:${BRAND.muted};line-height:1.6;">
          ${approved
            ? "O valor será creditado na sua conta em breve. Obrigado por usar a Meteorfy!"
            : "Se tiver dúvidas sobre a recusa, entre em contacto com o suporte da Meteorfy."}
        </td>
      </tr>
    </table>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: approved ? `✅ Saque aprovado — ${amount}` : `❌ Saque recusado — ${amount}`,
    html: baseLayout(approved ? "Saque Aprovado" : "Saque Recusado", body),
  });
}

// ─────────────────────────────────────────────────────────────
// 4. SELLER — Withdrawal Request Received
// ─────────────────────────────────────────────────────────────
export async function sendWithdrawalReceived(opts: {
  to: string;
  amount: string;
  method: string;
  pixKey: string;
  withdrawalId: number;
}) {
  const { to, amount, method, pixKey, withdrawalId } = opts;
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${BRAND.amber}1a;border-radius:50%;margin-bottom:12px;">
            <span style="font-size:28px;">⏳</span>
          </div>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${BRAND.text};">Pedido de saque recebido</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};">O seu pedido está a ser analisado. Prazo: 1–2 dias úteis.</p>
        </td>
      </tr>
      ${divider()}
      <tr><td style="padding:16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Valor solicitado", amount, BRAND.amber)}
          ${row("Método", method)}
          ${row("Conta", pixKey)}
          ${row("Status", "Pendente", BRAND.amber)}
          ${row("ID do saque", `#${withdrawalId}`, BRAND.muted)}
        </table>
      </td></tr>
      ${divider()}
      <tr>
        <td style="padding-top:16px;font-size:13px;color:${BRAND.muted};line-height:1.6;">
          Processamento disponível das <strong style="color:${BRAND.text};">9:30h</strong> às <strong style="color:${BRAND.text};">15:30h</strong> em dias úteis. Irá receber uma notificação quando o saque for processado.
        </td>
      </tr>
    </table>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `⏳ Pedido de saque recebido — ${amount}`,
    html: baseLayout("Pedido de Saque", body),
  });
}
