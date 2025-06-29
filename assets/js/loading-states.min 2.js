const fs = require('fs'),
  path = require('path');
class LoadingStateEnhancer {
  constructor() {
    this.htmlDir = '.';
  }
  async enhance() {
    const a = this.findFiles(this.htmlDir, ['.html']);
    for (const t of a)
      try {
        let a = fs.readFileSync(t, 'utf8');
        (a = this.addFormLoadingStates(a)),
          (a = this.addButtonLoadingStates(a)),
          (a = this.addLinkLoadingStates(a)),
          (a = this.addLoadingOverlay(a)),
          fs.writeFileSync(t, a);
      } catch (a) {}
  }
  addFormLoadingStates(a) {
    return (a = (a = a.replace(/<form([^>]*)>/g, (a, t) =>
      t.includes('class=')
        ? a.replace(/class="([^"]*)"/, 'class="$1 form-with-loading"')
        : `<form${t} class="form-with-loading">`
    )).replace(/<button([^>]*)type="submit"([^>]*)>/g, (a, t, s) =>
      a.includes('class=')
        ? a.replace(/class="([^"]*)"/, 'class="$1 button-with-loading"')
        : `<button${t}type="submit"${s} class="button-with-loading">`
    ));
  }
  addButtonLoadingStates(a) {
    return (a = a.replace(/<button([^>]*)>/g, (a, t) =>
      t.includes('class=')
        ? a.replace(/class="([^"]*)"/, 'class="$1 button-with-loading"')
        : `<button${t} class="button-with-loading">`
    ));
  }
  addLinkLoadingStates(a) {
    return (a = a.replace(/<a([^>]*)href="([^"]*)"([^>]*)>/g, (a, t, s, n) =>
      s.startsWith('#') || s.startsWith('javascript:')
        ? a
        : a.includes('class=')
          ? a.replace(/class="([^"]*)"/, 'class="$1 link-with-loading"')
          : `<a${t}href="${s}"${n} class="link-with-loading">`
    ));
  }
  addLoadingOverlay(a) {
    return (
      a.includes('loading-overlay') ||
        (a = a.replace(
          /<body([^>]*)>/,
          '<body$1>\n    <div id="loading-overlay" class="loading-overlay" style="display: none">\n      <div class="spinner"></div>\n      <p id="loading-message">Loading...</p>\n    </div>'
        )),
      a
    );
  }
  findFiles(a, t) {
    let s = [];
    const n = fs.readdirSync(a);
    for (const i of n) {
      const n = path.join(a, i);
      fs.statSync(n).isDirectory()
        ? (s = s.concat(this.findFiles(n, t)))
        : t.some(a => i.endsWith(a)) && s.push(n);
    }
    return s;
  }
}
const enhancer = new LoadingStateEnhancer();
enhancer.enhance();
