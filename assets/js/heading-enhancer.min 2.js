const fs = require('fs'),
  path = require('path');
class HeadingEnhancer {
  constructor() {
    this.htmlDir = '.';
  }
  async enhance() {
    const e = this.findFiles(this.htmlDir, ['.html']);
    for (const a of e)
      try {
        let e = fs.readFileSync(a, 'utf8');
        (e = this.fixHeadingHierarchy(e)),
          (e = this.addSectionHeadings(e, a)),
          (e = this.addSchemaMarkup(e, a)),
          fs.writeFileSync(a, e);
      } catch (e) {}
  }
  fixHeadingHierarchy(e) {
    (e.match(/<h1[^>]*>.*?<\/h1>/gs) || []).length > 1 &&
      (e = e.replace(/<h1[^>]*>(.*?)<\/h1>/g, (e, a, n) => (0 === n ? e : `<h2>${a}</h2>`)));
    let a = 1;
    const n = /<h([1-6])[^>]*>(.*?)<\/h\1>/g;
    let i,
      t = e;
    for (; null !== (i = n.exec(e)); ) {
      const e = parseInt(i[1]);
      if (e > a + 1) {
        const e = a + 1,
          n = i[2],
          r = i[0],
          o = `<h${e}>${n}</h${e}>`;
        t = t.replace(r, o);
      }
      a = e;
    }
    return t;
  }
  addSectionHeadings(e, a) {
    const n = path.basename(a, '.html');
    return (
      this.getSectionsForPage(n).forEach(a => {
        if (!e.includes(`<h${a.level}>${a.title}</h${a.level}>`)) {
          const n = `\n          <section class="${a.class}" aria-labelledby="${a.id}">\n            <h${a.level} id="${a.id}">${a.title}</h${a.level}>\n            ${a.content}\n          </section>\n        `;
          e = e.replace(a.content, n);
        }
      }),
      e
    );
  }
  addSchemaMarkup(e, a) {
    const n = path.basename(a, '.html'),
      i = this.generateSchema(n);
    if (!e.includes('application/ld+json')) {
      const a = `\n        <script type="application/ld+json">\n          ${JSON.stringify(i, null, 2)}\n        <\/script>\n      `;
      return e.replace('</head>', `${a}\n</head>`);
    }
    return e;
  }
  getSectionsForPage(e) {
    return (
      {
        index: [
          {
            level: 2,
            title: 'Welcome to Holliday Lawn & Garden',
            class: 'welcome-section',
            id: 'welcome',
            content: '<div class="welcome-content"></div>',
          },
          {
            level: 2,
            title: 'Our Services',
            class: 'services-section',
            id: 'services',
            content: '<div class="services-content"></div>',
          },
          {
            level: 2,
            title: 'Why Choose Us',
            class: 'why-us-section',
            id: 'why-us',
            content: '<div class="why-us-content"></div>',
          },
        ],
        about: [
          {
            level: 2,
            title: 'Our Story',
            class: 'story-section',
            id: 'story',
            content: '<div class="story-content"></div>',
          },
          {
            level: 2,
            title: 'Our Team',
            class: 'team-section',
            id: 'team',
            content: '<div class="team-content"></div>',
          },
          {
            level: 2,
            title: 'Our Mission',
            class: 'mission-section',
            id: 'mission',
            content: '<div class="mission-content"></div>',
          },
        ],
        services: [
          {
            level: 2,
            title: 'Lawn Care Services',
            class: 'lawn-care-section',
            id: 'lawn-care',
            content: '<div class="lawn-care-content"></div>',
          },
          {
            level: 2,
            title: 'Landscaping Services',
            class: 'landscaping-section',
            id: 'landscaping',
            content: '<div class="landscaping-content"></div>',
          },
          {
            level: 2,
            title: 'Garden Services',
            class: 'garden-section',
            id: 'garden',
            content: '<div class="garden-content"></div>',
          },
        ],
      }[e] || []
    );
  }
  generateSchema(e) {
    const a = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: this.getPageTitle(e),
      description: this.getPageDescription(e),
      url: `https://hollidaylawngarden.com/${e}`,
      publisher: {
        '@type': 'Organization',
        name: 'Holliday Lawn & Garden',
        logo: {
          '@type': 'ImageObject',
          url: 'https://hollidaylawngarden.com/assets/images/hollidays-logo.png',
        },
      },
    };
    return (
      'index' === e &&
        ((a['@type'] = 'WebSite'),
        (a.potentialAction = {
          '@type': 'SearchAction',
          target: 'https://hollidaylawngarden.com/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        })),
      a
    );
  }
  getPageTitle(e) {
    return (
      {
        index: 'Holliday Lawn & Garden - Professional Landscaping Services',
        about: 'About Holliday Lawn & Garden - Our Story and Mission',
        services: 'Our Services - Professional Lawn Care and Landscaping',
        contact: 'Contact Holliday Lawn & Garden - Get in Touch',
        gallery: 'Our Work - Holliday Lawn & Garden Portfolio',
        testimonials: 'Customer Testimonials - Holliday Lawn & Garden Reviews',
        faq: 'Frequently Asked Questions - Holliday Lawn & Garden',
        privacy: 'Privacy Policy - Holliday Lawn & Garden',
        terms: 'Terms of Service - Holliday Lawn & Garden',
        login: 'Login - Holliday Lawn & Garden Customer Portal',
        register: 'Register - Create Your Holliday Lawn & Garden Account',
        profile: 'My Profile - Holliday Lawn & Garden Customer Portal',
        dashboard: 'Customer Dashboard - Holliday Lawn & Garden',
        admin: 'Admin Dashboard - Holliday Lawn & Garden',
        pay: 'Pay Your Bill - Holliday Lawn & Garden',
        receipt: 'Payment Receipt - Holliday Lawn & Garden',
        education: 'Lawn Care Education - Holliday Lawn & Garden',
        sitemap: 'Sitemap - Holliday Lawn & Garden',
        offline: 'Offline - Holliday Lawn & Garden',
        error: 'Error - Holliday Lawn & Garden',
        404: 'Page Not Found - Holliday Lawn & Garden',
      }[e] || 'Holliday Lawn & Garden'
    );
  }
  getPageDescription(e) {
    return (
      {
        index:
          'Professional lawn care and landscaping services in your area. Get expert lawn maintenance, garden design, and outdoor living solutions.',
        about:
          "Learn about Holliday Lawn & Garden's commitment to excellence in lawn care and landscaping. Discover our story, mission, and values.",
        services:
          "Explore our comprehensive lawn care and landscaping services. From lawn maintenance to garden design, we've got you covered.",
        contact:
          'Get in touch with Holliday Lawn & Garden. Contact us for a free consultation or to schedule our services.',
        gallery:
          'View our portfolio of successful lawn care and landscaping projects. See the quality of our work and get inspired.',
        testimonials:
          'Read what our satisfied customers have to say about our lawn care and landscaping services.',
        faq: 'Find answers to common questions about our lawn care and landscaping services.',
        privacy: 'Read our privacy policy to understand how we protect your personal information.',
        terms: "Review our terms of service for using Holliday Lawn & Garden's services.",
        login:
          'Access your Holliday Lawn & Garden customer account. Manage your services and payments.',
        register:
          'Create your Holliday Lawn & Garden customer account. Get started with our services.',
        profile: 'Manage your Holliday Lawn & Garden customer profile and preferences.',
        dashboard:
          'Access your Holliday Lawn & Garden customer dashboard. View your services and account information.',
        admin: 'Access the Holliday Lawn & Garden admin dashboard. Manage customers and services.',
        pay: 'Pay your Holliday Lawn & Garden bill securely online.',
        receipt: 'View your Holliday Lawn & Garden payment receipt.',
        education:
          'Learn about lawn care and gardening from our experts. Get tips and advice for maintaining your outdoor space.',
        sitemap: 'Navigate the Holliday Lawn & Garden website with our comprehensive sitemap.',
        offline: 'You are currently offline. Please check your internet connection.',
        error: 'An error has occurred. Please try again later.',
        404: 'The page you are looking for could not be found.',
      }[e] || 'Professional lawn care and landscaping services in your area.'
    );
  }
  findFiles(e, a) {
    let n = [];
    const i = fs.readdirSync(e);
    for (const t of i) {
      const i = path.join(e, t);
      fs.statSync(i).isDirectory()
        ? (n = n.concat(this.findFiles(i, a)))
        : a.some(e => t.endsWith(e)) && n.push(i);
    }
    return n;
  }
}
const enhancer = new HeadingEnhancer();
enhancer.enhance();
