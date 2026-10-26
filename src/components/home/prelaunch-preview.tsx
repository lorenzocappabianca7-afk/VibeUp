import { landingCopy } from "@/content/landing";
import Image from "next/image";

function PhoneShot({
  src,
  alt,
  frame,
  sizes,
  loading,
}: {
  src: string;
  alt: string;
  frame: "left" | "right" | "center";
  sizes: string;
  loading: "lazy" | "eager";
}) {
  return (
    <div className={`vu-phone vu-phone-${frame}`}>
      <div className="vu-phone-screen">
        <Image src={src} alt={alt} fill sizes={sizes} loading={loading} className="vu-phone-img" />
      </div>
    </div>
  );
}

export function PrelaunchPreview() {
  return (
    <section className="vu-preview vu-reveal-item" data-vu-reveal aria-label={landingCopy.previewLabel}>
      <div className="vu-preview-fit">
      <div className="vu-preview-stage">
        <PhoneShot
          src="/landing/vibeup-esplora.jpg"
          alt={landingCopy.previewExploreAlt}
          frame="left"
          sizes="(min-width: 1024px) 214px, 150px"
          loading="lazy"
        />
        <PhoneShot
          src="/landing/vibeup-eventi.jpg"
          alt={landingCopy.previewEventsAlt}
          frame="right"
          sizes="(min-width: 1024px) 214px, 150px"
          loading="lazy"
        />
        <PhoneShot
          src="/landing/vibeup-home.jpg"
          alt={landingCopy.previewHomeAlt}
          frame="center"
          sizes="(min-width: 1024px) 300px, 210px"
          loading="eager"
        />
        <div className="vu-sticker">
          <svg width="84" height="84" viewBox="0 0 96 96" aria-hidden="true">
            <defs>
              <path id="vuBadgeTop" d="M13 48 A35 35 0 0 1 83 48" />
              <path id="vuBadgeBottom" d="M7 48 A41 41 0 0 0 89 48" />
            </defs>
            <circle cx="48" cy="48" r="46" fill="#F5F5F7" stroke="#F091B2" strokeWidth="2" />
            <text fontWeight="800" fontSize="8.5" letterSpacing="0.6" fill="#0F1115">
              <textPath href="#vuBadgeTop" startOffset="50%" textAnchor="middle">
                {landingCopy.previewLaunch}
              </textPath>
            </text>
            <text fontWeight="800" fontSize="7.5" letterSpacing="0.8" fill="#0F1115">
              <textPath href="#vuBadgeBottom" startOffset="50%" textAnchor="middle">
                {landingCopy.previewSoon}
              </textPath>
            </text>
            <circle cx="8" cy="48" r="2.2" fill="#F091B2" />
            <circle cx="88" cy="48" r="2.2" fill="#3ECFCF" />
            <circle cx="48" cy="48" r="30" fill="#0F1115" />
            <text
              x="48"
              y="58"
              textAnchor="middle"
              fontWeight="900"
              fontSize="27"
              letterSpacing="-1"
              fill="#F091B2"
            >
              {landingCopy.previewMark}
            </text>
          </svg>
        </div>
      </div>
      </div>
    </section>
  );
}
