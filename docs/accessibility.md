# Accessibility recommendatons

## Page Structure

Give a unique informative title for every page and a hidden H1 for screen readers e.g.
<title>4 April 2026 | Saturday Dig | DTV Tracker</title>
<h1 class="sr-only">Wednesday Dig, 8 April 2026</h1>

After that "promote" h2 to be the "Rubik Dirt" instance. Then more use of sections.

<section aria-labelledby="going-on-heading">
  <h2 id="going-on-heading">What's going on?</h2>
  ...
</section>

## HTML Head

Examples are additive don't remove what we have already just cheking that the following exists.
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>4 April 2026 | Saturday Dig | DTV Tracker</title>
  <meta
    name="description"
    content="Book or view details for the Saturday Dig on 4 April 2026 with Dean Trail Volunteers."
  />
  <meta name="theme-color" content="#0f0e17" /> (set as a var)
  <link rel="icon" type="image/png" href="/img/logo.png" />
  <link rel="apple-touch-icon" href="/img/icon-192.png" />
  <link rel="manifest" href="/site.webmanifest" />
</head>

## No fallback if JavaScript fails

For a JS app, it is still good practice to include a <noscript> message.

## No skip link
Ahead of the header stright to the hidden H1.

<a class="skip-link" href="#main-content">Skip to main content</a>

## Burger menu
More aria and remove redundant titles.

<button
  aria-label="Open navigation menu"
  aria-expanded="false"
  aria-controls="site-menu"
>
  <img src="/icons/burger.svg" alt="">
</button>

And change to aria-expanded="true" when expanded.

## Focus Styling Missing

Almost no visible :focus or :focus-visible styling.

## Decorative images and functional images are mixed up
Only functional images need a valid Alt tag.

## Gallery and Calendar is not accessible with clickable divs

A calendar should usually be one of an actual table-based calendar for simple browsing or an ARIA grid/date picker pattern if fully interactive.

<button
  aria-label="Saturday 4 April 2026, selected, session available"
  aria-current="date"
>
  4
</button>

In addition the Gallery needs more descriptive Alt tags on images (content issue as long as code uses the SharePoint description).

## Use of font
Consider plain sans-serif for blocks of text, long descriptions, policy/terms etc. Keep Rubik minimal and Momo Trust for headings/bold.

## Footer
Tiny tweak ...
<p>© 2026 <a href="...">Dean Trail Volunteers</a></p>