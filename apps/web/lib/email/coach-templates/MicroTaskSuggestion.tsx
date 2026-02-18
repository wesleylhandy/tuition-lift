/**
 * MicroTaskSuggestion — React Email template for 48h staleness nudge (US6 T039).
 * Coach persona: action-oriented, athletic metaphors, small-win focus (FR-013, FR-014).
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

export interface MicroTaskSuggestionEmailProps {
  /** Stale applications with Coach-persona suggestions. */
  items: Array<{
    scholarshipTitle: string;
    deadline: string | null;
    suggestion: string;
  }>;
  /** Dashboard URL for CTA. */
  dashboardUrl?: string;
  /** Preview text for email clients. */
  previewText?: string;
}

/**
 * Encouraging Coach tone: small wins, momentum, action-oriented (FR-014).
 */
export function MicroTaskSuggestionEmail({
  items,
  dashboardUrl = "https://tuitionlift.com/dashboard",
  previewText = "A quick 5 minutes can unlock your momentum.",
}: MicroTaskSuggestionEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={heading}>
            🏃 Small Win Waiting
          </Heading>
          <Text style={introText}>
            You haven&apos;t touched these applications in a couple days. A quick
            5-minute micro-task can restart your momentum — no pressure, just
            one small step forward.
          </Text>

          {items.map((item, i) => (
            <Section key={i} style={card}>
              <Text style={title}>{item.scholarshipTitle}</Text>
              {item.deadline && (
                <Text style={deadline}>Due: {item.deadline}</Text>
              )}
              <Text style={suggestion}>{item.suggestion}</Text>
            </Section>
          ))}

          <Hr style={hr} />
          <Text style={cta}>
            <Link href={dashboardUrl} style={link}>
              Open TuitionLift
            </Link>{" "}
            and spend 5 minutes on one of these. Small wins add up. Let&apos;s
            go. 💪
          </Text>
          <Text style={footer}>
            — Your Coach at TuitionLift. One step at a time.
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
  margin: "0 0 8px",
};

const suggestion = {
  color: "#4a5568",
  fontSize: "14px",
  lineHeight: 1.5,
  margin: 0,
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

export default MicroTaskSuggestionEmail;
