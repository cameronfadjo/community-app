const FLAG = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#004DFF', '#750787'];

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const NAV = [
  { href: '/support', label: 'Support' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
];

const FOOTER = [
  { href: '/terms', label: 'Terms of Use' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/support', label: 'Support' },
  { href: '/delete-account', label: 'Delete your account' },
];

const links = (items, current) =>
  items
    .map(
      ({ href, label }) =>
        `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`
    )
    .join('\n        ');

export const renderPage = ({ title, description, path, body, appName, isDraft }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${isDraft ? '<meta name="robots" content="noindex">' : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="header">
    <div class="wrap header-row">
      <a class="brand" href="/">
        <span class="flag" aria-hidden="true">${FLAG.map((color) => `<span style="background:${color}"></span>`).join('')}</span>
        ${escapeHtml(appName)}
      </a>
      <nav aria-label="Main">
        ${links(NAV, path)}
      </nav>
    </div>
  </header>
  <main id="main" class="wrap">
    ${
      isDraft
        ? '<p class="draft" role="note"><strong>Draft.</strong> This page is not final and is not yet in force.</p>'
        : ''
    }
    <article class="prose">
${body}
    </article>
  </main>
  <footer class="footer">
    <div class="wrap">
      <nav aria-label="Footer">
        ${links(FOOTER, path)}
      </nav>
      <p>${escapeHtml(appName)} is for people aged 18 and over.</p>
    </div>
  </footer>
</body>
</html>
`;
