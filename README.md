# FreeForAI

An open garden for small ideas, useful little tools, and interactions worth trying.

## Run locally

This is a dependency-free static site. From the project directory, run:

```sh
python -m http.server 8080
```

Then open `http://localhost:8080`.

## How visitor ideas work

- The three starter sparks are part of the page and are not presented as visitor submissions.
- The imaginary sky window grew from a visitor's “I want to see planets!” seed; it cycles through five made-up worlds.
- The community seedbed reads public issues from this repository and only displays issues with a `[seed]` title prefix.
- While the page is open, the seedbed checks for new public ideas every five minutes.
- The “Plant a seed” form takes a draft to GitHub's issue composer. The visitor reviews and publishes it there, so the site needs no private API token or database.
- Published ideas are public, and a GitHub account is required to submit one.

## Publish with GitHub Pages

The site has no build step. In the repository's **Settings → Pages**, choose **Deploy from a branch**, select `main`, and use `/ (root)` as the folder. The `index.html` at the project root is the entry point.

Visitor submissions use the repository's public Issues feature. Draft text is held only in the current page until the visitor continues to GitHub; the site does not store drafts in local storage.
