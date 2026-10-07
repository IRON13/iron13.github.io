(() => {
    const host = document.getElementById('visitor-widget-host');
    if (!host) return;
    const message = document.getElementById('visitor-widget-message');
    // The provider loads protocol-relative assets; file:// cannot run its widget.
    if (!['http:', 'https:'].includes(location.protocol)) {
        message.textContent = 'Live statistics are available in the web preview and on the published site.';
        return;
    }
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = 'mapmyvisitors';
    script.src = 'https://mapmyvisitors.com/map.js?d=B371rAOGyFmYaLNcdWPw0K9KoLoj2cplM7yBiawIBjg&cl=dce5ed&co=ffffff&ct=28578a&w=a';
    script.onerror = () => { message.textContent = 'Visitor statistics are temporarily unavailable.'; };
    host.append(script);
})();
