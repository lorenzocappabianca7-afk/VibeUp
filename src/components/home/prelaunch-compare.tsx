import { useLandingCopy } from "@/lib/locale/use-localized";
import type { LandingCompareMark, LandingCompareVenue } from "@/lib/landing/compare-table";

function Price({ value }: { value: string }) {
  const parts = value.split("–");
  if (parts.length !== 2) return value;
  return (
    <>
      {parts[0]}–<wbr />
      {parts[1]}
    </>
  );
}

function Mark({ value }: { value: LandingCompareMark }) {
  const landingCopy = useLandingCopy();
  if (value === "yes") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3ECFCF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-label={landingCopy.compareYes}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (value === "no") {
    return (
      <span className="vu-compare-no" role="img" aria-label={landingCopy.compareNo}>
        –
      </span>
    );
  }
  return (
    <span className="vu-compare-missing" role="img" aria-label={landingCopy.compareMissing}>
      —
    </span>
  );
}

export function PrelaunchCompare({ venues }: { venues: LandingCompareVenue[] }) {
  const landingCopy = useLandingCopy();
  if (venues.length === 0) return null;
  return (
    <section className="vu-compare" data-vu-reveal aria-label={landingCopy.compareMode}>
      <h2 className="vu-compare-title vu-reveal-item vu-brand">
        {landingCopy.compareLead}
        <span className="vu-compare-mode">{landingCopy.compareMode}</span>
        {landingCopy.compareMid}
        <span className="vu-compare-instant">{landingCopy.compareInstant}</span>
        {landingCopy.compareTail}
      </h2>
      <div className="vu-compare-wrap vu-reveal-item vu-reveal-d1">
        <table className="vu-compare-table">
          <colgroup>
            <col className="vu-compare-label-col" />
            {venues.map((venue) => (
              <col key={venue.name} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" />
              {venues.map((venue) => (
                <th key={venue.name} scope="col" className="vu-compare-venue">
                  <span className="vu-compare-name">{venue.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{landingCopy.comparePrice}</th>
              {venues.map((venue) => (
                <td key={venue.name}>
                  <Price value={venue.price} />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">{landingCopy.compareCapacity}</th>
              {venues.map((venue) => (
                <td key={venue.name}>{venue.capacity}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">{landingCopy.compareOutdoor}</th>
              {venues.map((venue) => (
                <td key={venue.name}>
                  <Mark value={venue.outdoor} />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">{landingCopy.compareParking}</th>
              {venues.map((venue) => (
                <td key={venue.name}>
                  <Mark value={venue.parking} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
