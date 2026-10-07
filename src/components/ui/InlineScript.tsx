/**
 * Script inline eseguito durante il parsing dell'HTML, prima del primo paint
 * (pattern della guida Next.js "Preventing flash before hydration").
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Tema salvato + attivazione dell'intro sulla home (una volta per sessione). */
export const BOOT_SCRIPT = `(function(){var d=document.documentElement;d.dataset.js="1";try{var t=localStorage.getItem("tl-theme");if(t==="light"||t==="dark")d.dataset.theme=t}catch(e){}var p=location.pathname.replace(/\\/$/,"");if((p===""||p==="/en")&&location.search.indexOf("nointro")<0){var s=null;try{s=sessionStorage.getItem("tl-intro-seen")}catch(e){}if(s!=="1")d.dataset.intro="play"}})();`;
