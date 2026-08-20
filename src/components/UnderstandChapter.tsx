"use client";

import { useMemo, useState } from "react";
import {
  UNDERSTAND_TOPICS,
  type UnderstandTopic,
  type UnderstandTopicId,
} from "@/lib/understandTopics";

/**
 * Understand chapter: topic buttons that reveal one foam card at a time —
 * same visual language as Compare school evidence cards.
 */
export function UnderstandChapter() {
  const topics = UNDERSTAND_TOPICS;
  const [activeId, setActiveId] = useState<UnderstandTopicId>(
    topics[0]?.id ?? "how-to-read",
  );
  const active = useMemo(
    () => topics.find((topic) => topic.id === activeId) ?? topics[0],
    [activeId, topics],
  );

  if (!active) return null;

  return (
    <div className="understand-chapter" data-tour="how">
      <div className="section-head">
        <h2>Understand the figures</h2>
        <p>
          Choose a topic to open one card at a time — the same guides as the
          Guides section, plus where the numbers come from. Use this before you
          treat a table or précis as a verdict.
        </p>
      </div>

      <div
        className="understand-topic-rail"
        role="tablist"
        aria-label="Understand topics"
      >
        {topics.map((topic) => {
          const selected = topic.id === active.id;
          return (
            <button
              key={topic.id}
              type="button"
              role="tab"
              id={`understand-tab-${topic.id}`}
              className={
                selected
                  ? "understand-topic-btn is-active"
                  : "understand-topic-btn"
              }
              aria-selected={selected}
              aria-controls={`understand-panel-${topic.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(topic.id)}
            >
              {topic.shortLabel}
            </button>
          );
        })}
      </div>

      <UnderstandTopicCard topic={active} />
    </div>
  );
}

function UnderstandTopicCard({ topic }: { topic: UnderstandTopic }) {
  return (
    <article
      className="compare-evidence-card understand-topic-card"
      role="tabpanel"
      id={`understand-panel-${topic.id}`}
      aria-labelledby={`understand-tab-${topic.id}`}
    >
      <header className="compare-evidence-card-head">
        <h4>{topic.title}</h4>
        <p>{topic.lead}</p>
      </header>
      <div className="compare-evidence-card-body understand-topic-body">
        {topic.sections?.map((section) => (
          <section key={section.id} className="understand-topic-block">
            <h5 className="compare-evidence-label">{section.title}</h5>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        {topic.faqs?.map((faq) => (
          <section key={faq.question} className="understand-topic-block">
            <h5 className="compare-evidence-label">{faq.question}</h5>
            <p className="understand-topic-faq-answer">{faq.answer}</p>
          </section>
        ))}

        {topic.paragraphs?.map((paragraph) => (
          <p key={paragraph.slice(0, 48)} className="understand-topic-para">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
