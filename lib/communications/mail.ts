import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587)
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const EMAIL_FROM = process.env.EMAIL_FROM
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

let transporter: nodemailer.Transporter | null = null

export function isMailConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && EMAIL_FROM)
}

function getTransporter() {
  if (!isMailConfigured()) {
    throw new Error('Mail transport is not configured')
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  }

  return transporter
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const mailer = getTransporter()

  await mailer.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text,
  })
}

export function getAppUrl() {
  return APP_URL.replace(/\/$/, '')
}

export async function sendWorkspaceInviteEmail({
  to,
  workspaceName,
  inviterName,
  inviteUrl,
  role,
}: {
  to: string
  workspaceName: string
  inviterName: string
  inviteUrl: string
  role: string
}) {
  const subject = `${inviterName} invited you to join ${workspaceName} on FinTrack`
  const text = [
    `${inviterName} invited you to join the ${workspaceName} workspace on FinTrack.`,
    `Role: ${role}`,
    `Accept invite: ${inviteUrl}`,
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 8px;">Workspace invitation</h2>
      <p><strong>${inviterName}</strong> invited you to join <strong>${workspaceName}</strong> on FinTrack.</p>
      <p>Your role will be <strong>${role}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${inviteUrl}" style="background:#059669;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
          Accept invitation
        </a>
      </p>
      <p>If the button does not work, copy this link into your browser:</p>
      <p>${inviteUrl}</p>
    </div>
  `

  await sendEmail({ to, subject, html, text })
}

export async function sendPaymentReminderEmail({
  to,
  fullName,
  items,
}: {
  to: string
  fullName: string
  items: Array<{ title: string; dueLabel: string; amountLabel: string }>
}) {
  const subject = 'Upcoming payment reminders from FinTrack'
  const intro = fullName ? `Hi ${fullName},` : 'Hello,'
  const text = [
    intro,
    '',
    'Here are your upcoming payment reminders:',
    ...items.map((item) => `- ${item.title}: ${item.amountLabel}, due ${item.dueLabel}`),
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>${intro}</p>
      <p>Here are your upcoming payment reminders:</p>
      <ul>
        ${items.map((item) => `<li><strong>${item.title}</strong> · ${item.amountLabel} · due ${item.dueLabel}</li>`).join('')}
      </ul>
    </div>
  `

  await sendEmail({ to, subject, html, text })
}

export async function sendBudgetAlertEmail({
  to,
  fullName,
  budgetName,
  percentUsed,
  spent,
  budgetAmount,
  remaining,
  exceeded,
  currency = 'Ksh',
}: {
  to: string
  fullName: string
  budgetName: string
  percentUsed: number
  spent: number
  budgetAmount: number
  remaining: number
  exceeded: boolean
  currency?: string
}) {
  const subject = exceeded
    ? `Budget exceeded: ${budgetName} — FinTrack`
    : `Budget warning: ${budgetName} at ${percentUsed.toFixed(0)}% — FinTrack`
  const intro = fullName ? `Hi ${fullName},` : 'Hello,'
  const statusLine = exceeded
    ? `You have exceeded your <strong>${budgetName}</strong> budget.`
    : `You are approaching your <strong>${budgetName}</strong> budget limit.`
  const color = exceeded ? '#DC2626' : '#D97706'

  const text = [
    intro,
    exceeded
      ? `You have exceeded your ${budgetName} budget.`
      : `You are at ${percentUsed.toFixed(0)}% of your ${budgetName} budget.`,
    `Spent: ${currency} ${spent.toFixed(2)} of ${currency} ${budgetAmount.toFixed(2)}`,
    `Remaining: ${currency} ${remaining.toFixed(2)}`,
    `Review your budget: ${getAppUrl()}/dashboard/budgets`,
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>${intro}</p>
      <p>${statusLine}</p>
      <table style="border-collapse: collapse; min-width: 300px;">
        <tr><td style="padding: 6px 12px 6px 0; color: #6B7280;">Spent</td><td><strong style="color:${color}">${currency} ${spent.toFixed(2)}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #6B7280;">Budget</td><td><strong>${currency} ${budgetAmount.toFixed(2)}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #6B7280;">Remaining</td><td><strong>${currency} ${remaining.toFixed(2)}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #6B7280;">Usage</td><td><strong>${percentUsed.toFixed(0)}%</strong></td></tr>
      </table>
      <p style="margin: 24px 0;">
        <a href="${getAppUrl()}/dashboard/budgets" style="background:#059669;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
          View budgets
        </a>
      </p>
    </div>
  `

  await sendEmail({ to, subject, html, text })
}

export async function sendWeeklyDigestEmail({
  to,
  fullName,
  incomeLabel,
  expenseLabel,
  netLabel,
  transactionCount,
  periodLabel,
}: {
  to: string
  fullName: string
  incomeLabel: string
  expenseLabel: string
  netLabel: string
  transactionCount: number
  periodLabel: string
}) {
  const subject = `Your FinTrack weekly digest for ${periodLabel}`
  const intro = fullName ? `Hi ${fullName},` : 'Hello,'
  const text = [
    intro,
    '',
    `Here is your weekly digest for ${periodLabel}:`,
    `Income: ${incomeLabel}`,
    `Expenses: ${expenseLabel}`,
    `Net: ${netLabel}`,
    `Transactions: ${transactionCount}`,
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>${intro}</p>
      <p>Here is your weekly digest for <strong>${periodLabel}</strong>.</p>
      <table style="border-collapse: collapse; min-width: 320px;">
        <tr><td style="padding: 6px 12px 6px 0;">Income</td><td><strong>${incomeLabel}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0;">Expenses</td><td><strong>${expenseLabel}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0;">Net</td><td><strong>${netLabel}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0;">Transactions</td><td><strong>${transactionCount}</strong></td></tr>
      </table>
    </div>
  `

  await sendEmail({ to, subject, html, text })
}
