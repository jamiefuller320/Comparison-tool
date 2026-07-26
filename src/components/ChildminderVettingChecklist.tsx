"use client";

import { CHILDMINDER_VETTING_CHECKLIST } from "@/lib/childminderChecklist";
import { SEED_GEOGRAPHY_LABEL } from "@/lib/seedScope";

export function ChildminderVettingChecklist({
  consentedAsAt,
  sourcePage,
  providerCount,
}: {
  consentedAsAt?: string | null;
  sourcePage?: string | null;
  providerCount?: number | null;
}) {
  return (
    <div data-tour="childminders">
      <h3 className="compare-subhead">Vetting checklist for parents</h3>
      <p className="footnote" style={{ marginBottom: "1rem" }}>
        Use this when assessing a childminder — including wrap-around cover
        around school. Ofsted redacts most childminder contact details in its
        main dataset; Schoolside lists {SEED_GEOGRAPHY_LABEL} providers who have{" "}
        <strong>consented to publish</strong> their name and address
        {providerCount != null
          ? ` (${providerCount.toLocaleString("en-GB")} in this build)`
          : null}
        . Coverage is incomplete by design — providers can withdraw consent.
        Phone numbers are not in Ofsted’s file; use the address and Ofsted
        report link, then contact via the routes they publish.
        {consentedAsAt ? ` Consented register as at ${consentedAsAt}.` : null}{" "}
        {sourcePage ? (
          <a href={sourcePage} target="_blank" rel="noreferrer">
            Ofsted consented addresses ↗
          </a>
        ) : null}
      </p>

      <ol className="vetting-checklist">
        {CHILDMINDER_VETTING_CHECKLIST.map((item, index) => (
          <li key={item.id}>
            <span className="vetting-step">{index + 1}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
