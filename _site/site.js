// Leads with the download for the visitor's own computer: it becomes the page's single teal action (DESIGN.md).
// Without script, or on a phone, every download stays an equal choice.
(() => {
  const agent = navigator.userAgent;
  const platform =
    /Windows/.test(agent) ? "windows" : /Macintosh|Mac OS X/.test(agent) && !/iPhone|iPad/.test(agent) ? "mac" : /Ubuntu|Debian|Mint/.test(agent) ? "deb" : /Linux/.test(agent) && !/Android/.test(agent) ? "linux" : null;
  const yours = platform && document.querySelector(`.downloads [data-platform="${platform}"]`);
  if (!yours) return;
  yours.classList.add("yours");
  yours.parentElement.prepend(yours);
})();
