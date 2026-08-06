import json
from pathlib import Path

from school_capture.learned_terms import (
    cross_school_boosts,
    decay_learned_terms,
    is_useful_term,
    load_learned_term_counts,
    load_learned_terms,
    prune_learned_terms,
    save_learned_terms,
)


def test_blocks_stopwords_and_cms_noise():
    assert not is_useful_term("and")
    assert not is_useful_term("the")
    assert not is_useful_term("our")
    assert not is_useful_term("about")
    assert not is_useful_term("pid123")
    assert is_useful_term("curriculum")
    assert is_useful_term("enrichment")


def test_decay_and_prune():
    store = {"curriculum": 10, "and": 100, "clubs": 1, "send": 4}
    decayed = decay_learned_terms(store, factor=0.5)
    assert decayed["curriculum"] == 5
    assert decayed["send"] == 2
    assert "and" not in decayed
    pruned = prune_learned_terms(decayed, min_count=2)
    assert "clubs" not in pruned
    assert pruned["curriculum"] == 5
    assert pruned["send"] == 2


def test_boosts_rank_shared_topics_over_school_noise():
    counts = {
        "curriculum": 400,
        "send": 200,
        "alver valley schools": 90,
        "shared clubs programme": 30,
        "clubs": 8,
        "aug24": 40,  # singleton CMS fragment
        "applemore": 50,  # singleton school token
    }
    df = {
        "curriculum": 10,
        "send": 6,
        "alver valley schools": 2,  # still too school-specific
        "shared clubs programme": 4,  # cross-school phrase kept
        "clubs": 3,
        "aug24": 1,
        "applemore": 1,
    }
    boosts = cross_school_boosts(counts, df, n_schools=12)
    assert "alver valley schools" not in boosts
    assert "aug24" not in boosts
    assert "applemore" not in boosts
    assert "shared clubs programme" in boosts
    assert "curriculum" in boosts
    assert "send" in boosts
    assert boosts["curriculum"] >= boosts["clubs"]
    assert boosts["curriculum"] == max(boosts.values())
    # Must differentiate — flat MAX_BOOST everywhere means learning is inert.
    assert len(set(boosts.values())) >= 3
    assert all(1 <= v <= 12 for v in boosts.values())


def test_load_boosts_not_confused_with_raw_counts(tmp_path: Path):
    """CLI must score with IDF boosts but persist/mutate raw counts."""
    path = tmp_path / "learned.json"
    counts = {"curriculum": 100, "send": 40, "ethos": 10}
    df = {"curriculum": 8, "send": 5, "ethos": 3}
    save_learned_terms(counts, path, min_count=1, df=df, school_count=10)
    loaded_counts = load_learned_term_counts(path)
    loaded_boosts = load_learned_terms(path)
    assert loaded_counts["curriculum"] == 100
    assert loaded_boosts["curriculum"] <= 12
    # Boosts are ranked scores, not raw hit counts.
    assert loaded_boosts["curriculum"] != loaded_counts["curriculum"]
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["terms"]["curriculum"] == 100
