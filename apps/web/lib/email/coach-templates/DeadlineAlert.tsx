/**
 * DeadlineAlert — React Email template for 72h/24h deadline urgency (US4 T029).
 * Coach persona: urgent, action-oriented language (FR-008, FR-009a, FR-014).
 * Consolidates all approaching deadlines with prioritization section.
 *
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §6
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface DeadlineAlertEmailProps {
  /** Prioritized deadline items (essays first, by due date). */
  deadlines: Array<{
    scholarshipTitle: string;
    deadline: string;
    urgency: "72h" | "24h";
    applicationType?: string | null;
  }>;
  /** Primary urgency for subject/preview. */
  notificationType: "deadline_72h" | "deadline_24h";
  /** Dashboard URL for CTA. */
  dashboardUrl?: string;
  /** Preview text for email clients. */
  previewText?: string;
}

/**
 * Encouraging Coach tone: urgent, action-oriented (FR-014).
 */
export function DeadlineAlertEmail({
  deadlines,
  notificationType,
  dashboardUrl = "https://tuitionlift.com/dashboard",
  previewText = "Deadlines approaching — time to lock in.",
}: DeadlineAlertEmailProps) {
  const is24h = notificationType === "deadline_24h";
  const headline = is24h ? "⚡ 24 Hours Left" : "🔥 72 Hours to Go";
  const intro =
    is24h
      ? "Tomorrow is game day. These applications need your focus now — lock in."
      : "You're in the final stretch. Here's your prioritization plan to cross the finish line.";

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={heading}>
            {headline}
          </Heading>
          <Text style={introText}>{intro}</Text>

          <Section style={section}>
            <Text style={priorityLabel}>Prioritization Plan</Text>
            <Text style={priorityNote}>
              Essays first (they need more time), then forms. Order by due date.
            </Text>
          </Section>

          {deadlines.map((item, i) => (
            <Section key={i} style={card}>
              <Text style={title}>{item.scholarshipTitle}</Text>
              <Text style={deadline}>
                Due: {item.deadline}
                {item.urgency === "24h" && (
                  <span style={urgent}> — Last 24 hours!</span>
                )}
              </Text>
              {item.applicationType && (
                <Text style={typeLabel}>
                  {item.applicationType === "essay"
                    ? "Essay"
                    : item.applicationType === "form"
                      ? "Form"
                      : "Mixed"}
                </Text>
              )}
            </Section>
          ))}

          <Hr style={hr} />
          <Text style={cta}>
            <Link href={dashboardUrl} style={link}>
              Open TuitionLift
            </Link>{" "}
            to review and submit. Every minute counts. Let&apos;s go.
          </Text>
          <Text style={footer}>
            — Your Coach at TuitionLift. Lock in. 💪
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const heading = {
  color: "#1a1a2e",
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0 0 16px",
  lineHeight: 1.3,
};

const introText = {
  color: "#4a5568",
  fontSize: "16px",
  lineHeight: 1.6,
  margin: "0 0 24px",
};

const section = {
  backgroundColor: "#fff7ed",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 20px",
};

const priorityLabel = {
  color: "#9a3412",
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
};

const priorityNote = {
  color: "#c2410c",
  fontSize: "13px",
  lineHeight: 1.5,
  margin: 0,
};

const card = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 12px",
};

const title = {
  color: "#1a1a2e",
  fontSize: "16px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
};

const deadline = {
  color: "#718096",
  fontSize: "14px",
  margin: "0 0 4px",
};

const urgent = {
  color: "#dc2626",
  fontWeight: "600" as const,
};

const typeLabel = {
  color: "#64748b",
  fontSize: "12px",
  margin: "4px 0 0",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const cta = {
  color: "#4a5568",
  fontSize: "14px",
  lineHeight: 1.6,
  margin: "0 0 16px",
};

const link = {
  color: "#667eea",
  fontWeight: "600" as const,
};

const footer = {
  color: "#718096",
  fontSize: "13px",
  margin: 0,
};

export default DeadlineAlertEmail;
