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
- A visitor can make a portable seed card without signing in. Its text travels in the URL fragment, which browsers do not send to the site server; anyone with the link can read it, and it is not uploaded or added to the public seedbed.
- The recipient can forward that link, or choose to plant the seed in the public garden. Planting opens GitHub's issue composer for review and publication.
- Public ideas live in this repository's GitHub Issues, so a GitHub account is required to publish to the shared garden. A central anonymous suggestion wall would need a separate backend.

## Publish with GitHub Pages

The site has no build step. In the repository's **Settings → Pages**, choose **Deploy from a branch**, select `main`, and use `/ (root)` as the folder. The `index.html` at the project root is the entry point.

The site does not store drafts in local storage. Drafts stay in the page until a visitor chooses to create a share link or continue to GitHub.
