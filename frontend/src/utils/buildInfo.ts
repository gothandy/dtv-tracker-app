const REPO_URL = 'https://github.com/gothandy/dtv-tracker-app'

export interface BuildLink {
  /** Text shown in the About modal, e.g. `a1b2c3d` or `PR #274 · a1b2c3d`. */
  label: string
  /** Where the label links to on GitHub. */
  href: string
}

/**
 * What the About modal's GitHub row shows for this build.
 *
 * Production builds (from `main`) link to the commit. Preview builds come from
 * a pull request, so they link to the PR and name the PR's own commit, not the
 * temporary merge commit GitHub builds from.
 */
export function buildLink(commit: string, prNumber: string): BuildLink | null {
  if (!commit) return null
  const short = commit.slice(0, 7)
  if (prNumber) {
    return { label: `PR #${prNumber} · ${short}`, href: `${REPO_URL}/pull/${prNumber}` }
  }
  return { label: short, href: `${REPO_URL}/commit/${commit}` }
}
