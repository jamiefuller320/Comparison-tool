/** Parent-facing vetting prompts for assessing childminders. */

export interface ChecklistItem {
  id: string;
  title: string;
  detail: string;
}

/**
 * Practical questions parents can work through when shortlisting or visiting
 * a registered childminder. Not a substitute for Ofsted registration checks
 * or professional advice.
 */
export const CHILDMINDER_VETTING_CHECKLIST: ChecklistItem[] = [
  {
    id: "registration",
    title: "Confirm Ofsted registration",
    detail:
      "Ask for their Ofsted Unique Reference Number (URN) and open the latest report. Check they are currently registered on the Early Years Register for the ages you need.",
  },
  {
    id: "safeguarding",
    title: "Safeguarding and insurance",
    detail:
      "Ask how they keep children safe (home safety, visitors, outings, sleep, allergies). Confirm public liability insurance and that first-aid training is in date.",
  },
  {
    id: "ratios",
    title: "Numbers, ages and assistants",
    detail:
      "Clarify how many children they care for at once, age mix, and whether any assistants or students are present. Legal ratios matter — ask what a typical day looks like.",
  },
  {
    id: "routines",
    title: "Day structure and learning",
    detail:
      "Talk through meals, outdoor play, screen time, quiet time, and how they support early language and social skills. Fit with your child’s temperament matters as much as the timetable.",
  },
  {
    id: "communication",
    title: "Updates and partnerships",
    detail:
      "Agree how you will hear about the day (app, notebook, chat at pickup), illness policies, and how concerns are raised. Good two-way communication is a strong signal.",
  },
  {
    id: "trial",
    title: "Settling visits before you commit",
    detail:
      "Arrange short settling sessions with you present, then try a paid trial if offered. Watch how your child is greeted and comforted — your instincts count.",
  },
  {
    id: "contract",
    title: "Fees, hours and notice",
    detail:
      "Get written terms: hours, fees, deposits, holiday pay, sickness, late pickup, and notice periods. Check funded hours (if any) and what is included in the fee.",
  },
  {
    id: "references",
    title: "Speak to other parents",
    detail:
      "Where possible, ask for parent references or local recommendations. Cross-check anything that feels unclear against the Ofsted report and registration status.",
  },
];
