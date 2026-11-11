"use client";

/** Title and the filters the guest just chose, shown above the location list. */
export function ExploreResultHeading({
  count,
  chips,
}: {
  count: number;
  chips: string[];
}) {
  return (
    <div>
      <p className="text-xl font-bold tracking-tight text-primary-black">
        {count} location per te
      </p>
      {chips.length > 0 ? (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => (
            <li
              key={chip}
              className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-primary-black/70"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
