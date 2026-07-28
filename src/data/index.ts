/**
 * Optional barrel — prefer direct imports: `@/data/trainers`, `@/data/locations`.
 * Static mock data until API/CMS exists.
 */
export {
  trainers,
  getTrainerById,
  professions,
  specialties,
  genders,
  priceRanges,
} from "./trainers";

export {
  MARKETPLACE_CITIES,
  CITY_NEIGHBORHOODS,
  getNeighborhoodsForCity,
} from "./locations";
