export type LandingCompareMark = "yes" | "no" | "missing";

export type LandingCompareVenue = {
  name: string;
  price: string;
  capacity: string;
  outdoor: LandingCompareMark;
  parking: LandingCompareMark;
};
