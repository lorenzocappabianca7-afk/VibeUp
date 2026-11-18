import { DemoEntry } from "@/components/demo/demo-entry";
import { readTrustedSignupId } from "@/server/launch/signup-cookie";
import { preload } from "react-dom";

/** Full loads with no signup skip the loader and go straight to the form. */
const EARLY_SIGNUP_REDIRECT = `(function(){var search="";try{search=window.location.search||"";}catch(e){search="";}if(/(?:^|[?&])t=/.test(search))return;try{var id=window.localStorage.getItem("vu_signup_id");if(id&&String(id).trim())return;}catch(e){}window.location.replace("/#iscriviti");})();`;

export default async function DemoRoutePage() {
  preload("/demo/confy.svg", { as: "image", fetchPriority: "high" });
  const trustedSignupId = await readTrustedSignupId();
  return (
    <>
      {trustedSignupId ? null : (
        <script dangerouslySetInnerHTML={{ __html: EARLY_SIGNUP_REDIRECT }} />
      )}
      <DemoEntry trustedSignupId={trustedSignupId} />
    </>
  );
}
