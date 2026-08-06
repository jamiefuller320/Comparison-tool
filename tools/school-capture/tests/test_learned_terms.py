from school_capture.learned_terms import (
    cross_school_boosts,
    decay_learned_terms,
    is_useful_term,
    prune_learned_terms,
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


def test_idf_drops_singleton_school_names():
    counts = {
        "curriculum": 40,
        "alver valley schools": 90,
        "shared clubs programme": 30,
        "send": 20,
        "clubs": 8,
    }
    df = {
        "curriculum": 10,
        "alver valley schools": 2,  # still too school-specific
        "shared clubs programme": 4,  # cross-school phrase kept
        "send": 6,
        "clubs": 3,
    }
    boosts = cross_school_boosts(counts, df, n_schools=12)
    assert "alver valley schools" not in boosts
    assert "shared clubs programme" in boosts
    assert "curriculum" in boosts
    assert "send" in boosts
    assert all(1 <= v <= 12 for v in boosts.values())
