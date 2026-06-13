import type { CityConfig } from "./types";

/** All accredited TCF Canada centres in Canada, grouped by province. */
export const CITIES: CityConfig[] = [
  // British Columbia
  {
    id: "victoria",
    name: "Victoria",
    region: "British Columbia",
    organization: "Alliance Française Victoria",
    bookingUrl: "https://www.afvictoria.ca/exams/tcf/",
  },
  {
    id: "vancouver",
    name: "Vancouver",
    region: "British Columbia",
    organization: "Alliance Française Vancouver",
    bookingUrl:
      "https://www.alliancefrancaise.ca/en/language/exams/tcf-canada/",
  },
  // Alberta
  {
    id: "calgary",
    name: "Calgary",
    region: "Alberta",
    organization: "Alliance Française Calgary",
    bookingUrl:
      "https://www.afcalgary.ca/exams/tcf/registration-process/",
  },
  {
    id: "edmonton",
    name: "Edmonton",
    region: "Alberta",
    organization: "Alliance Française Edmonton",
    bookingUrl: "https://www.afedmonton.com/en/exams/tcf/",
  },
  // Manitoba
  {
    id: "winnipeg",
    name: "Winnipeg",
    region: "Manitoba",
    organization: "Alliance Française Manitoba",
    bookingUrl: "https://www.afmanitoba.ca/en/exams/tcf/",
  },
  // Ontario
  {
    id: "ottawa",
    name: "Ottawa",
    region: "Ontario",
    organization: "Alliance Française Ottawa",
    bookingUrl: "https://af.ca/ottawa/en/tests_et_examens/tcf/",
  },
  {
    id: "toronto",
    name: "Toronto / GTA",
    region: "Ontario",
    organization: "Alliance Française Toronto",
    bookingUrl:
      "https://www.alliance-francaise.ca/en/exams/tests/informations-about-tcf-canada/tcf-canada",
    locations: ["Toronto", "North York", "Mississauga", "Oakville"],
  },
  // Quebec
  {
    id: "montreal",
    name: "Montréal",
    region: "Quebec",
    organization: "Alliance Française Montréal",
    bookingUrl: "https://www.afmontreal.ca/tcf/",
  },
  {
    id: "montreal-concordia",
    name: "Montréal (Concordia)",
    region: "Quebec",
    organization: "Concordia University CCE",
    bookingUrl:
      "https://www.concordia.ca/cce/language-testing/tcf-test.html",
  },
  {
    id: "kirkland",
    name: "Kirkland (West Island)",
    region: "Quebec",
    organization: "Kuper Academy",
    bookingUrl:
      "https://www.kuperacademy.ca/en/academics/tcf-canada-tcf-quebec-test-de-connaissance-du-francais.html",
  },
  {
    id: "montreal-stanislas",
    name: "Montréal (Stanislas)",
    region: "Quebec",
    organization: "Collège Stanislas — Outremont",
    bookingUrl: "https://stanislas.qc.ca/tcf/",
  },
  {
    id: "quebec-city",
    name: "Québec City",
    region: "Quebec",
    organization: "Collège Stanislas — Québec",
    bookingUrl: "https://stanislas.qc.ca/tcf/",
  },
  // New Brunswick
  {
    id: "moncton",
    name: "Moncton",
    region: "New Brunswick",
    organization: "Alliance Française Moncton",
    bookingUrl: "https://www.afmoncton.ca/en/inscription-au-tcf-canada/",
  },
  // Nova Scotia
  {
    id: "halifax",
    name: "Halifax",
    region: "Nova Scotia",
    organization: "Alliance Française Halifax",
    bookingUrl:
      "https://afhalifax.ca/test-your-french/tcf/tcf-canada-registration/",
  },
];

export function getCityById(id: string): CityConfig | undefined {
  return CITIES.find((c) => c.id === id);
}
