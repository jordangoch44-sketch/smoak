export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  /** Explore deep link (profession or specialty param) */
  exploreHref: string;
}
