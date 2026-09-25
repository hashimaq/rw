const THEME_INIT = `(function(){try{var k='rw-theme';var t=localStorage.getItem(k);var d=document.documentElement;var dark=false;if(t==='dark')dark=true;else if(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)dark=true;else if(t!=='light'&&t!=='dark'&&t!=='system'){dark=false;}d.classList.toggle('dark',dark);d.style.colorScheme=dark?'dark':'light';}catch(e){document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}})();`;

export function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: THEME_INIT }}
      suppressHydrationWarning
    />
  );
}
