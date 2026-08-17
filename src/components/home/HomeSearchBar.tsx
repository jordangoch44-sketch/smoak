"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  HOME_SEARCH_PROMPTS,
  buildHomeSearchHref,
} from "@/lib/home-browse-categories";
import { prepareNavScrollReset } from "@/lib/mobile-chrome";
import { SITE_ROUTES } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const ROTATE_MS = 2600;

export function HomeSearchBar() {
  const router = useRouter();
  const reduceMotion = usePrefersReducedMotion();
  const [query, setQuery] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [promptVisible, setPromptVisible] = useState(true);

  const trimmed = query.trim();
  const showPrompt = trimmed.length === 0;
  const prompt = HOME_SEARCH_PROMPTS[promptIndex] ?? HOME_SEARCH_PROMPTS[0];

  useEffect(() => {
    if (reduceMotion || !showPrompt) return;

    let fadeId = 0;
    const id = window.setInterval(() => {
      setPromptVisible(false);
      fadeId = window.setTimeout(() => {
        setPromptIndex((current) => (current + 1) % HOME_SEARCH_PROMPTS.length);
        setPromptVisible(true);
      }, 220);
    }, ROTATE_MS);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(fadeId);
    };
  }, [reduceMotion, showPrompt]);

  function goToSearch(value: string) {
    prepareNavScrollReset(SITE_ROUTES.explore);
    router.push(buildHomeSearchHref(value));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToSearch(query);
  }

  return (
    <form
      className="home-hero-search"
      role="search"
      onSubmit={handleSubmit}
    >
      <label htmlFor="home-marketplace-search" className="sr-only">
        Search specialists
      </label>
      <div className="home-hero-search__field">
        <SearchIcon className="home-hero-search__icon" />
        <div className="home-hero-search__input-wrap">
          {showPrompt ? (
            <span
              key={prompt}
              className={cn(
                "home-hero-search__prompt",
                !reduceMotion &&
                  (promptVisible
                    ? "home-hero-search__prompt--in"
                    : "home-hero-search__prompt--out")
              )}
              aria-hidden
            >
              {prompt}
            </span>
          ) : null}
          <input
            id="home-marketplace-search"
            className="home-hero-search__input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search specialists"
          />
        </div>
      </div>
    </form>
  );
}
