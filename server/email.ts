import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.warn("[email] RESEND_API_KEY not set — emails will not be sent");
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(key);
  }
  return _resend;
}
const resend = { emails: { send: async (opts: any, throws = false) => { try { return await getResend().emails.send(opts); } catch (err) { console.warn("[email] send failed:", err instanceof Error ? err.message : err); if (throws) throw err; return null; } } } };
const resendStrict = { emails: { send: async (opts: any) => resend.emails.send(opts, true) } };

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
// 1. BUYER — Sale Confirmation + Delivery
// ─────────────────────────────────────────────────────────────
export async function sendBuyerConfirmation(opts: {
  to: string;
  productName: string;
  amount: string;
  orderId: string;
  paymentMethod: string;
  deliveryUrl?: string | null;
  deliveryFiles?: string[];
}) {
  const { to, productName, amount, orderId, paymentMethod, deliveryUrl, deliveryFiles } = opts;

  const hasDelivery = deliveryUrl || (deliveryFiles && deliveryFiles.length > 0);

  const deliverySection = hasDelivery ? `
    ${divider()}
    <tr>
      <td style="padding-top:16px;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:${BRAND.muted};text-transform:uppercase;letter-spacing:1px;">📦 Acesso ao Produto</p>
        ${deliveryUrl ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
          <tr>
            <td align="center">
              <a href="${deliveryUrl}" target="_blank"
                 style="display:inline-block;background:${BRAND.purple};color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 32px;border-radius:12px;letter-spacing:0.3px;">
                🔓 Aceder ao Produto
              </a>
            </td>
          </tr>
        </table>` : ""}
        ${deliveryFiles && deliveryFiles.length > 0 ? deliveryFiles.map((f: string, i: number) => {
          const raw = f.split("/").pop() || `Arquivo ${i + 1}`;
          const fileName = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(raw)
            ? decodeURIComponent(raw.substring(37))
            : decodeURIComponent(raw);
          return `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            <tr>
              <td style="background:#1c1c1f;border:1px solid #3f3f46;border-radius:10px;padding:12px 14px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:32px;vertical-align:middle;">
                      <span style="font-size:22px;">⬇️</span>
                    </td>
                    <td style="vertical-align:middle;padding:0 10px;">
                      <p style="margin:0;font-size:13px;font-weight:600;color:#e4e4e7;word-break:break-all;">${fileName}</p>
                      <p style="margin:2px 0 0;font-size:11px;color:${BRAND.muted};">Clique no botão para baixar</p>
                    </td>
                    <td style="width:90px;text-align:right;vertical-align:middle;">
                      <a href="${f}" target="_blank"
                         style="display:inline-block;background:${BRAND.purple};color:#ffffff;text-decoration:none;font-weight:700;font-size:12px;padding:8px 14px;border-radius:8px;white-space:nowrap;">
                        ⬇ Baixar
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>`;
        }).join("") : ""}
      </td>
    </tr>` : "";

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
      ${deliverySection}
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

// ─────────────────────────────────────────────────────────────
// 5. SELLER — Product Approved
// ─────────────────────────────────────────────────────────────
export async function sendProductApproved(opts: {
  to: string;
  productName: string;
  productId: number;
}) {
  const { to, productName, productId } = opts;
  const dashUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "meteorfy.com"}/products`;
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${BRAND.green}1a;border-radius:50%;margin-bottom:12px;">
            <span style="font-size:28px;">🚀</span>
          </div>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${BRAND.text};">Produto aprovado!</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};">O seu produto foi analisado e está aprovado para venda.</p>
        </td>
      </tr>
      ${divider()}
      <tr><td style="padding:16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Produto", productName, BRAND.green)}
          ${row("ID", `#${productId}`, BRAND.muted)}
          ${row("Status", "Aprovado ✅", BRAND.green)}
        </table>
      </td></tr>
      ${divider()}
      <tr>
        <td style="padding-top:20px;text-align:center;">
          <a href="${dashUrl}" style="display:inline-block;background:${BRAND.purple};color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;">
            Ver Produtos →
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding-top:16px;font-size:13px;color:${BRAND.muted};line-height:1.6;text-align:center;">
          O seu produto já está disponível nos checkouts e pode receber vendas agora.
        </td>
      </tr>
    </table>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `🚀 Produto aprovado — ${productName}`,
    html: baseLayout("Produto Aprovado", body),
  });
}

// ─────────────────────────────────────────────────────────────
// 6. SELLER — Product Rejected
// ─────────────────────────────────────────────────────────────
export async function sendProductRejected(opts: {
  to: string;
  productName: string;
  productId: number;
}) {
  const { to, productName, productId } = opts;
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${BRAND.red}1a;border-radius:50%;margin-bottom:12px;">
            <span style="font-size:28px;">⛔</span>
          </div>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${BRAND.text};">Produto não aprovado</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};">O seu produto foi recusado pela equipa da Meteorfy.</p>
        </td>
      </tr>
      ${divider()}
      <tr><td style="padding:16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Produto", productName)}
          ${row("ID", `#${productId}`, BRAND.muted)}
          ${row("Status", "Recusado ⛔", BRAND.red)}
        </table>
      </td></tr>
      ${divider()}
      <tr>
        <td style="padding-top:16px;font-size:13px;color:${BRAND.muted};line-height:1.6;">
          Se tiver dúvidas sobre a recusa ou quiser corrigir o produto, entre em contacto com o suporte da Meteorfy. Pode editar e resubmeter o produto para nova análise.
        </td>
      </tr>
    </table>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `⛔ Produto recusado — ${productName}`,
    html: baseLayout("Produto Recusado", body),
  });
}

// ─────────────────────────────────────────────────────────────
// 7. SELLER — New Bank Account Added
// ─────────────────────────────────────────────────────────────
export async function sendNewBankAccount(opts: {
  to: string;
  method: string;
  phone: string;
  name: string;
}) {
  const { to, method, phone, name } = opts;
  const ismpesa = method.toLowerCase().includes("pesa");
  const iconBg = ismpesa ? "#e11d48" : "#f97316";
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${iconBg}22;border-radius:50%;margin-bottom:12px;">
            <span style="font-size:28px;">📱</span>
          </div>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${BRAND.text};">Método de saque adicionado</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};">Uma nova conta de saque foi registada na sua conta.</p>
        </td>
      </tr>
      ${divider()}
      <tr><td style="padding:16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Método", method)}
          ${row("Titular", name || "—")}
          ${row("Número", phone)}
        </table>
      </td></tr>
      ${divider()}
      <tr>
        <td style="padding-top:16px;padding-bottom:4px;background:#27272a;border-radius:10px;padding:14px 16px;margin-top:12px;">
          <p style="margin:0;font-size:12px;color:${BRAND.red};font-weight:700;">⚠ Não reconhece esta acção?</p>
          <p style="margin:6px 0 0;font-size:12px;color:${BRAND.muted};">Se não adicionou esta conta, aceda à sua conta imediatamente e remova-a ou altere a sua senha.</p>
        </td>
      </tr>
    </table>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `📱 Novo método de saque — ${method} (${phone})`,
    html: baseLayout("Novo Método de Saque", body),
  });
}

// ─────────────────────────────────────────────────────────────
// 8. VERIFICATION CODE
// ─────────────────────────────────────────────────────────────
export async function sendVerificationCode(opts: {
  to: string;
  code: string;
}) {
  const { to, code } = opts;
  const digits = code.split("");
  const digitBoxes = digits.map(d =>
    `<span style="display:inline-block;width:44px;height:52px;line-height:52px;text-align:center;font-size:26px;font-weight:900;color:${BRAND.text};background:#27272a;border:2px solid ${BRAND.purple};border-radius:10px;margin:0 4px;">${d}</span>`
  ).join("");

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${BRAND.purple}22;border-radius:50%;margin-bottom:12px;">
            <span style="font-size:28px;">🔐</span>
          </div>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${BRAND.text};">Código de verificação</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};">Introduza este código para activar a sua conta Meteorfy.</p>
        </td>
      </tr>
      ${divider()}
      <tr>
        <td style="padding:24px 0;text-align:center;">
          ${digitBoxes}
        </td>
      </tr>
      ${divider()}
      <tr>
        <td style="padding-top:16px;font-size:12px;color:${BRAND.muted};line-height:1.6;text-align:center;">
          Este código expira em <strong style="color:${BRAND.text};">15 minutos</strong>.<br/>
          Se não criou esta conta, ignore este email.
        </td>
      </tr>
    </table>`;

  return resendStrict.emails.send({
    from: FROM,
    to,
    subject: `${code} — Código de verificação Meteorfy`,
    html: baseLayout("Código de Verificação", body),
  });
}

// ─────────────────────────────────────────────────────────────
// 9. WITHDRAWAL — Confirmation Code
// ─────────────────────────────────────────────────────────────
export async function sendWithdrawalConfirmCode(opts: {
  to: string;
  code: string;
  amount: string;
  method: string;
}) {
  const { to, code, amount, method } = opts;
  const digits = code.split("");
  const digitBoxes = digits.map(d =>
    `<span style="display:inline-block;width:44px;height:52px;line-height:52px;text-align:center;font-size:26px;font-weight:900;color:${BRAND.text};background:#27272a;border:2px solid ${BRAND.amber};border-radius:10px;margin:0 4px;">${d}</span>`
  ).join("");

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${BRAND.amber}22;border-radius:50%;margin-bottom:12px;">
            <span style="font-size:28px;">🔒</span>
          </div>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${BRAND.text};">Confirmar saque</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};">Introduza este código para autorizar o saque de <strong style="color:${BRAND.amber};">${amount}</strong> via <strong style="color:${BRAND.text};">${method}</strong>.</p>
        </td>
      </tr>
      ${divider()}
      <tr>
        <td style="padding:24px 0;text-align:center;">
          ${digitBoxes}
        </td>
      </tr>
      ${divider()}
      <tr>
        <td style="padding-top:16px;font-size:12px;color:${BRAND.muted};line-height:1.6;text-align:center;">
          Este código expira em <strong style="color:${BRAND.text};">10 minutos</strong>.<br/>
          Se não solicitou este saque, ignore este email e verifique a sua conta.
        </td>
      </tr>
    </table>`;

  return resendStrict.emails.send({
    from: FROM,
    to,
    subject: `${code} — Autorização de saque Meteorfy (${amount})`,
    html: baseLayout("Autorização de Saque", body),
  });
}

// ─────────────────────────────────────────────────────────────
// 10. NEW USER — Welcome
// ─────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(opts: {
  to: string;
}) {
  const { to } = opts;
  const dashUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "meteorfy.com"}/dashboard`;
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${BRAND.purple}22;border-radius:50%;margin-bottom:12px;">
            <span style="font-size:28px;">👋</span>
          </div>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${BRAND.text};">Bem-vindo à Meteorfy!</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};">A sua conta foi criada com sucesso.</p>
        </td>
      </tr>
      ${divider()}
      <tr><td style="padding:16px 0;">
        <p style="margin:0 0 12px;font-size:13px;color:${BRAND.muted};">Aqui está o que pode fazer na Meteorfy:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("📦 Produtos", "Crie e gira os seus produtos digitais")}
          ${row("🛒 Checkouts", "Crie páginas de checkout personalizadas")}
          ${row("📊 Vendas", "Acompanhe as suas transações em tempo real")}
          ${row("💰 Saques", "Solicite saques via M-Pesa ou e-Mola")}
        </table>
      </td></tr>
      ${divider()}
      <tr>
        <td style="padding-top:20px;text-align:center;">
          <a href="${dashUrl}" style="display:inline-block;background:${BRAND.purple};color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;">
            Ir para o Dashboard →
          </a>
        </td>
      </tr>
    </table>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `👋 Bem-vindo à Meteorfy!`,
    html: baseLayout("Bem-vindo", body),
  });
}

// ─────────────────────────────────────────────────────────────
// 11. SELLER — First Sale 🏆
// ─────────────────────────────────────────────────────────────
export async function sendFirstSale(opts: {
  to: string;
  productName: string;
  amount: string;
  buyerEmail: string;
  orderId: string;
  paymentMethod: string;
}) {
  const { to, productName, amount, buyerEmail, orderId, paymentMethod } = opts;
  const dashUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "meteorfy.com"}/sales`;

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:24px;text-align:center;">
          <!-- Trophy badge -->
          <div style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#fbbf24,#f59e0b);border-radius:50%;width:72px;height:72px;line-height:72px;text-align:center;margin-bottom:16px;box-shadow:0 0 32px #f59e0b55;">
            <span style="font-size:38px;">🏆</span>
          </div>
          <!-- Gold seal -->
          <div style="display:inline-block;background:linear-gradient(135deg,#92400e,#f59e0b,#92400e);padding:6px 20px;border-radius:100px;margin-bottom:16px;">
            <span style="font-size:11px;font-weight:900;color:#fff;letter-spacing:2px;text-transform:uppercase;">✨ PRIMEIRA VENDA</span>
          </div>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:${BRAND.text};">Parabéns! Você fez a sua primeira venda!</h1>
          <p style="margin:0;font-size:14px;color:${BRAND.muted};line-height:1.6;">Este é um momento histórico na sua jornada de vendas.<br/>A primeira de muitas que estão por vir! 🚀</p>
        </td>
      </tr>
      ${divider()}
      <tr><td style="padding:16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Produto", productName)}
          ${row("Valor recebido", amount, "#f59e0b")}
          ${row("Comprador", buyerEmail)}
          ${row("Método", paymentMethod)}
          ${row("ID do pedido", `#${orderId}`, BRAND.muted)}
        </table>
      </td></tr>
      ${divider()}
      <tr>
        <td style="padding:20px 0;text-align:center;">
          <div style="background:#1c1917;border:1px solid #f59e0b44;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:1px;">💡 Dica de vendedor</p>
            <p style="margin:0;font-size:13px;color:${BRAND.muted};line-height:1.6;">Partilhe o seu checkout nas redes sociais e continue a crescer. O sucesso começa com a primeira venda!</p>
          </div>
          <a href="${dashUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 32px;border-radius:12px;letter-spacing:0.5px;">
            Ver as minhas vendas →
          </a>
        </td>
      </tr>
    </table>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `🏆 PRIMEIRA VENDA! ${productName} — ${amount}`,
    html: baseLayout("Primeira Venda", body),
  });
}
