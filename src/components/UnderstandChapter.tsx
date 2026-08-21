"use client";

import { useEffect, useMemo, useState } from "react";
import {
  UNDERSTAND_TOPICS,
  type UnderstandTopic,
  type UnderstandTopicId,
} from "@/lib/understandTopics";
import { HOME_SECTION_CHANGE_EVENT } from "@/lib/inPageNav";

function topicFromHash(hash: string): UnderstandTopicId | null {
  const id = hash.replace(/^#/, "");
  if (id === "data") return "data";
  if (UNDERSTAND_TOPICS.some((topic) => topic.id === id)) {
    return id as UnderstandTopicId;
  }
  return null;
}

/**
 * Understand chapter: topic buttons that reveal one foam card at a time —
 * same visual language as Compare school evidence cards.
 */
export function UnderstandChapter() {
  const topics = UNDERSTAND_TOPICS;
  const [activeId, setActiveId] = useState<UnderstandTopicId>(
    topics[0]?.id ?? "how-to-read",
  );

  useEffect(() => {
    function applyHash(hash: string) {
      const fromHash = topicFromHash(hash);
      if (fromHash) setActiveId(fromHash);
    }
    applyHash(window.location.hash);
    function onSection(event: Event) {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (id === "data") setActiveId("data");
    }
    function onHashChange() {
      applyHash(window.location.hash);
    }
    window.addEventListener(HOME_SECTION_CHANGE_EVENT, onSection);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener(HOME_SECTION_CHANGE_EVENT, onSection);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

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
          Choose a topic to open one card at a time — parent guides plus where
          the numbers come from. Use this before you treat a table or précis as
          a verdict.
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
  const hasBody =
    Boolean(topic.sections?.length) ||
    Boolean(topic.faqs?.length) ||
    Boolean(topic.paragraphs?.length) ||
    Boolean(topic.links?.length);

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
      {hasBody ? (
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

          {topic.paragraphs?.map((paragraph, index) => (
            <p key={`${topic.id}-p-${index}`} className="understand-topic-para">
              {paragraph}
            </p>
          ))}

          {topic.links?.length ? (
            <p className="understand-topic-links">
              Official pages:{" "}
              {topic.links.map((link, index) => (
                <span key={link.href}>
                  {index > 0 ? " · " : null}
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </span>
              ))}
              .
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
