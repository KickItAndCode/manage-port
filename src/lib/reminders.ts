/**
 * Composes the payment reminder a landlord sends a tenant.
 *
 * There is no email or SMS provider wired into this app, and adding one is not
 * the point — writing the message is the tedious part, not delivering it. This
 * produces text the landlord can send however they already talk to their
 * tenants: their mail client, SMS, WhatsApp. Sending stays theirs, which also
 * means nothing leaves the machine without them seeing it first.
 */

export interface ReminderLine {
  utilityType: string;
  billMonth: string;
  amountOwed: number;
}

export interface ReminderInput {
  tenantName: string;
  propertyName: string;
  unitIdentifier?: string;
  lines: ReminderLine[];
  totalOwed: number;
}

export interface Reminder {
  subject: string;
  body: string;
}

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

/** "1368 East 28th St — Garage", or just the property when there is no unit. */
export function describeAddress(propertyName: string, unitIdentifier?: string): string {
  return unitIdentifier ? `${propertyName} — ${unitIdentifier}` : propertyName;
}

export function buildPaymentReminder(input: ReminderInput): Reminder {
  const address = describeAddress(input.propertyName, input.unitIdentifier);

  // One line per outstanding charge. A tenant disputing a figure needs to see
  // which month and which utility it came from, not just a total.
  const items = input.lines
    .map((line) => `  • ${line.utilityType} (${line.billMonth}): ${money(line.amountOwed)}`)
    .join("\n");

  const plural = input.lines.length === 1 ? "charge" : "charges";

  const body = [
    `Hi ${input.tenantName},`,
    ``,
    `This is a reminder about ${input.lines.length} outstanding utility ${plural} for ${address}:`,
    ``,
    items,
    ``,
    `Total due: ${money(input.totalOwed)}`,
    ``,
    `Please let me know if you have any questions about these amounts.`,
    ``,
    `Thanks,`,
  ].join("\n");

  return {
    // Colon rather than a dash: the address may already contain one, and
    // "reminder — 1368 East 28th St — Main" reads as a run-on.
    subject: `Utility payment reminder: ${address} (${money(input.totalOwed)} due)`,
    body,
  };
}

/**
 * A mailto: URL for the reminder.
 *
 * Every component is encoded — an address containing "&" or "#" would
 * otherwise truncate the body at that character, silently sending a partial
 * message.
 */
export function reminderMailtoUrl(email: string, reminder: Reminder): string {
  const params = new URLSearchParams({
    subject: reminder.subject,
    body: reminder.body,
  });
  return `mailto:${encodeURIComponent(email)}?${params.toString()}`;
}
