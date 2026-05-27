/**
 * Join / create-account entry — all external navigation should use these helpers
 * so the welcome intro runs on intentional flow start (not inside the wizard).
 */

export const JOIN_FLOW_PATH = "/create-account";

/** @deprecated Use JOIN_FLOW_PATH — kept for existing imports */
export const CREATE_ACCOUNT_PATH = JOIN_FLOW_PATH;

/** Query flag — equivalent to React Router `state.showIntro` */
export const JOIN_INTRO_PARAM = "intro";

export function buildJoinFlowHref(): string {
  return `${JOIN_FLOW_PATH}?${JOIN_INTRO_PARAM}=1`;
}

export function shouldShowJoinIntro(
  searchParams: Pick<URLSearchParams, "get">
): boolean {
  return searchParams.get(JOIN_INTRO_PARAM) === "1";
}

type JoinFlowRouter = {
  push: (href: string) => void;
};

type JoinFlowReplaceRouter = {
  replace: (href: string) => void;
};

/** Navigate into join flow with welcome intro (hamburger Join, Create Account, etc.) */
export function startJoinFlow(router: JoinFlowRouter): void {
  router.push(buildJoinFlowHref());
}

/** Strip intro intent from URL after welcome completes — keeps user on questionnaire */
export function clearJoinIntroFromUrl(router: JoinFlowReplaceRouter): void {
  if (typeof window === "undefined") {
    router.replace(JOIN_FLOW_PATH);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  params.delete(JOIN_INTRO_PARAM);
  const qs = params.toString();
  router.replace(qs ? `${JOIN_FLOW_PATH}?${qs}` : JOIN_FLOW_PATH);
}
