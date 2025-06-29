const fs = require('fs'),
  path = require('path');
class UXEnhancer {
  constructor() {
    this.htmlDir = '.';
  }
  async enhance() {
    const e = this.findFiles(this.htmlDir, ['.html']);
    for (const a of e)
      try {
        let e = fs.readFileSync(a, 'utf8');
        (e = this.addToastNotifications(e)),
          (e = this.addBreadcrumbs(e, a)),
          (e = this.addProgressIndicators(e)),
          (e = this.addFormFeedback(e)),
          (e = this.addScrollToTop(e)),
          fs.writeFileSync(a, e);
      } catch (e) {}
  }
  addToastNotifications(e) {
    if (!e.includes('toast-container')) {
      const a =
        '\n        <div id="toast-container" class="toast-container">\n          <div id="toast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">\n            <div class="toast-header">\n              <strong class="me-auto" id="toast-title">Notification</strong>\n              <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>\n            </div>\n            <div class="toast-body" id="toast-message"></div>\n          </div>\n        </div>\n      ';
      return e.replace('</body>', `${a}\n</body>`);
    }
    return e;
  }
  addBreadcrumbs(e, a) {
    const s = path.basename(a, '.html'),
      t = this.generateBreadcrumbs(s);
    if (!e.includes('breadcrumb') && !e.includes('404.html')) {
      const a = `\n        <nav aria-label="breadcrumb" class="breadcrumb-container">\n          <ol class="breadcrumb">\n            ${t.map(e => `\n              <li class="breadcrumb-item ${e.active ? 'active' : ''}">\n                ${e.active ? e.text : `<a href="${e.href}">${e.text}</a>`}\n              </li>\n            `).join('')}\n          </ol>\n        </nav>\n      `;
      return e.replace('<main', `${a}\n<main`);
    }
    return e;
  }
  addProgressIndicators(e) {
    if (e.includes('<form') && !e.includes('progress-indicator')) {
      const a =
        '\n        <div class="progress-indicator" style="display: none;">\n          <div class="progress">\n            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>\n          </div>\n          <p class="progress-text">Processing...</p>\n        </div>\n      ';
      return e.replace('</form>', `${a}\n</form>`);
    }
    return e;
  }
  addFormFeedback(e) {
    if (e.includes('<form') && !e.includes('form-feedback')) {
      const a =
        '\n        <div class="form-feedback" role="alert" aria-live="polite" style="display: none;">\n          <div class="alert alert-success" role="alert">\n            <i class="fas fa-check-circle"></i>\n            <span class="feedback-message"></span>\n          </div>\n        </div>\n      ';
      return e.replace('</form>', `${a}\n</form>`);
    }
    return e;
  }
  addScrollToTop(e) {
    if (!e.includes('scroll-to-top')) {
      const a =
        '\n        <button id="scroll-to-top" class="scroll-to-top" aria-label="Scroll to top">\n          <i class="fas fa-arrow-up"></i>\n        </button>\n      ';
      return e.replace('</body>', `${a}\n</body>`);
    }
    return e;
  }
  generateBreadcrumbs(e) {
    const a = [{ text: 'Home', href: 'index.html', active: 'index' === e }],
      s = {
        about: 'About Us',
        services: 'Services',
        contact: 'Contact',
        gallery: 'Gallery',
        testimonials: 'Testimonials',
        faq: 'FAQ',
        privacy: 'Privacy Policy',
        terms: 'Terms of Service',
        login: 'Login',
        register: 'Register',
        profile: 'My Profile',
        dashboard: 'Dashboard',
        admin: 'Admin',
        pay: 'Pay Bill',
        receipt: 'Receipt',
        education: 'Education',
        sitemap: 'Sitemap',
      };
    return s[e] && a.push({ text: s[e], href: `${e}.html`, active: !0 }), a;
  }
  findFiles(e, a) {
    let s = [];
    const t = fs.readdirSync(e);
    for (const r of t) {
      const t = path.join(e, r);
      fs.statSync(t).isDirectory()
        ? (s = s.concat(this.findFiles(t, a)))
        : a.some(e => r.endsWith(e)) && s.push(t);
    }
    return s;
  }
}
const enhancer = new UXEnhancer();
enhancer.enhance();
