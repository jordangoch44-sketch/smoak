import Link from "next/link";
import { SITE_ROUTES } from "@/lib/navigation";
import { CALORIE_CALCULATOR_FAQS } from "@/lib/seo/calorie-calculator-seo";

/**
 * Server-rendered SEO copy for /calorie-calculator — visible to crawlers
 * even when the interactive tool is client-only.
 */
export function CalorieCalculatorSeoContent() {
  return (
    <section className="calorie-tool-seo" aria-labelledby="calorie-seo-heading">
      <div className="calorie-tool-seo__inner">
        <h2 id="calorie-seo-heading" className="calorie-tool-seo__title">
          Free calorie calculator for daily calories, TDEE, and weight loss
        </h2>
        <p className="calorie-tool-seo__copy">
          Use this free calorie calculator to estimate how many calories you
          need each day based on age, sex, height, weight, and activity level.
          SMOAC calculates an approximate BMR and TDEE, then shows calorie
          targets for maintaining weight or losing about 0.5, 1, or 2 pounds
          per week — plus a 12-week projection so you can see the path ahead.
        </p>
        <p className="calorie-tool-seo__copy">
          When you are ready for coaching, browse personal trainers,
          nutritionists, and wellness specialists on{" "}
          <Link href={SITE_ROUTES.home}>SMOAC</Link>, search the{" "}
          <Link href={SITE_ROUTES.explore}>map</Link>, or start with{" "}
          <Link href={SITE_ROUTES.findSanDiegoPersonalTrainers}>
            personal trainers in San Diego
          </Link>
          .
        </p>

        <h3 className="calorie-tool-seo__subtitle">What you can calculate</h3>
        <ul className="calorie-tool-seo__list">
          <li>Maintenance calories (TDEE) from activity level</li>
          <li>Daily calories for mild, standard, or faster weight loss</li>
          <li>Weight gain calorie paces when you want to build</li>
          <li>A simple 12-week weight projection chart</li>
          <li>Suggested trainers matched to your goal</li>
        </ul>

        <h3 className="calorie-tool-seo__subtitle">
          Calorie calculator FAQ
        </h3>
        <div className="calorie-tool-seo__faqs">
          {CALORIE_CALCULATOR_FAQS.map((item) => (
            <details key={item.question} className="calorie-tool-seo__faq">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
