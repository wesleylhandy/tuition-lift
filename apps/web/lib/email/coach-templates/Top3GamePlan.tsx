/**
 * Top3GamePlan — React Email template for daily Top 3 Game Plan.
 * T017: Coach persona micro-copy per FR-014, FR-015 (Encouraging Coach, dynamic).
 *
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §1
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

export interface Top3GamePlanEmailProps {
  /** Top 3 items with scholarship title, suggestion, deadline. */
  top3: Array<{
    scholarshipTitle: string;
    suggestion: string;
    deadline: string | null;
    momentumScore: number;
  }>;
  /** Dashboard URL for CTA. */
  dashboardUrl?: string;
  /** Preview text for email clients. */
  previewText?: string;
}

/**
 * Encouraging Coach tone: action-oriented, athletic metaphors, win-focused (FR-014).
 */
export function Top3GamePlanEmail({
  top3,
  dashboardUrl = "https://tuitionlift.com/dashboard",
  previewText = "Your daily Top 3 — let's lock in.",
}: Top3GamePlanEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={heading}>
            🏆 Your Top 3 Today
          </Heading>
          <Text style={intro}>
            Here are your three focus applications — ranked by momentum. Small
            wins add up. Let&apos;s lock in.
          </Text>

          {top3.map((item, i) => (
            <Section key={i} style={card}>
              <Text style={rank}>#{i + 1}</Text>
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
              Open your game plan in TuitionLift
            </Link>{" "}
            to track progress and celebrate wins.
          </Text>
          <Text style={footer}>
            — Your Coach at TuitionLift. One application at a time. 💪
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

const intro = {
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

const rank = {
  color: "#667eea",
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
};

const title = {
  color: "#1a1a2e",
  fontSize: "16px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
};

const deadline = {
  color: "#718096",
  fontSize: "13px",
  margin: "0 0 8px",
};

const suggestion = {
  color: "#2d3748",
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

export default Top3GamePlanEmail;
