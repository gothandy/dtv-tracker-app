/**
 * Common UI components and utilities
 */

/**
 * Create and insert the site header
 * @param {string} subtitle - The subtitle to display (e.g., "Volunteer Groups", "Volunteer Sessions")
 * @param {boolean} showBackLink - Whether to show the back to home link
 */
function createHeader(subtitle = 'Volunteer hours tracking and registration system', showBackLink = false) {
    const headerHTML = `
        <header style="background-color: #2c5f2d; color: white; padding: ${showBackLink ? '1.5rem 2rem' : '2rem'}; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${showBackLink ? '' : 'text-align: center;'}">
            <h1 style="font-size: ${showBackLink ? '1.8rem' : '2.5rem'}; margin-bottom: ${showBackLink ? '0.3rem' : '0.5rem'};">DTV Tracker</h1>
            <p style="font-size: ${showBackLink ? '0.95rem' : '1.1rem'}; opacity: 0.9;">${subtitle}</p>
        </header>
        ${showBackLink ? `
        <nav style="background-color: #f8f8f8; border-bottom: 1px solid #ddd; padding: 0.8rem 2rem;">
            <a href="/" style="color: #2c5f2d; text-decoration: none; font-weight: 500;">&larr; Back to Home</a>
        </nav>
        ` : ''}
    `;

    document.body.insertAdjacentHTML('afterbegin', headerHTML);
}

/**
 * Create the site footer
 */
function createFooter() {
    const footerHTML = `
        <footer style="text-align: center; padding: 2rem; color: #666; font-size: 0.9rem;">
            <p>Dean Trail Volunteers &copy; ${new Date().getFullYear()}</p>
        </footer>
    `;

    document.body.insertAdjacentHTML('beforeend', footerHTML);
}
