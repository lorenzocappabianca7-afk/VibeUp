import { landingCopy } from "@/content/landing";
import Image from "next/image";

function PhoneShot({
  src,
  alt,
  frame,
  sizes,
}: {
  src: string;
  alt: string;
  frame: "left" | "right" | "center";
  sizes: string;
}) {
  return (
    <div className={`vu-phone vu-phone-${frame}`}>
      <div className="vu-phone-screen">
        <Image src={src} alt={alt} fill sizes={sizes} loading="lazy" className="vu-phone-img" />
      </div>
    </div>
  );
}

export function PrelaunchPreview() {
  return (
    <section className="vu-preview" aria-label={landingCopy.previewLabel}>
      <div className="vu-preview-stage">
        <PhoneShot
          src="/landing/vibeup-esplora.jpg"
          alt={landingCopy.previewExploreAlt}
          frame="left"
          sizes="168px"
        />
        <PhoneShot
          src="/landing/vibeup-eventi.jpg"
          alt={landingCopy.previewEventsAlt}
          frame="right"
          sizes="168px"
        />
        <PhoneShot
          src="/landing/vibeup-home.jpg"
          alt={landingCopy.previewHomeAlt}
          frame="center"
          sizes="236px"
        />
        <div className="vu-badge">
          <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
            <defs>
              <path id="vuBadgeTop" d="M15 56 A41 41 0 0 1 97 56" />
              <path id="vuBadgeBottom" d="M8 56 A48 48 0 0 0 104 56" />
            </defs>
            <circle cx="56" cy="56" r="54" fill="#F5F5F7" stroke="#F091B2" strokeWidth="2" />
            <text fontWeight="800" fontSize="11" letterSpacing="1.2" fill="#0F1115">
              <textPath href="#vuBadgeTop" startOffset="50%" textAnchor="middle">
                {landingCopy.previewLaunch}
              </textPath>
            </text>
            <text fontWeight="800" fontSize="9" letterSpacing="1.2" fill="#0F1115">
              <textPath href="#vuBadgeBottom" startOffset="50%" textAnchor="middle">
                {landingCopy.previewSoon}
              </textPath>
            </text>
            <circle cx="9" cy="56" r="2.5" fill="#F091B2" />
            <circle cx="103" cy="56" r="2.5" fill="#3ECFCF" />
            <circle cx="56" cy="56" r="27" fill="#0F1115" />
            <text
              x="56"
              y="67"
              textAnchor="middle"
              fontWeight="900"
              fontSize="30"
              letterSpacing="-1"
              fill="#F091B2"
            >
              {landingCopy.previewMark}
            </text>
          </svg>
        </div>
      </div>
    </section>
  );
}
