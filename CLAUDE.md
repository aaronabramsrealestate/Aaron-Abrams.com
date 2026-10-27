# Working on this site

## One deploy per round of changes
Every merge into `main` triggers a Netlify deploy, so bundle work into as few deploys as possible.

- Before committing or merging, look for everything else that is ready to go out: other open branches or pull requests with finished work, pending fixes, and small changes the user asked for earlier in the session. Fold all of it into one branch and one merge.
- Only merge into `main` once all of that work is on the branch and checked. Do not merge one change, then open another pull request minutes later for something that could have shipped with it.
- If something is ready but the user has not approved it yet, ask before bundling it rather than shipping it on its own later.

## Writing style
Never use em dashes or en dashes in site copy, commit messages, or messages to the user. Use a comma, or start a new sentence.

## Repository notes
See README.txt for the page list, data files, Follow Up Boss setup, and deploy steps.
