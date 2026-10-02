# FreeForAI

An explorable planet for small ideas, useful little tools, and interactions worth trying.

## Run locally

This is a dependency-free static site. From the project directory, run:

```sh
python -m http.server 8080
```

Then open `http://localhost:8080`.

## How visitor ideas work

- The landing view is a draggable orbital map. Six stations open their own spaces; use the arrow keys to rotate between stations and Escape to return to orbit.
- The spaces include an imaginary observatory, a community seed forest, a fragment-mixing dream lab, a one-minute breathing moon, an open signal room, and a pocket-world forge.
- The three starter sparks are part of the page and are not presented as visitor submissions.
- The imaginary sky window grew from a visitor's “I want to see planets!” seed; it cycles through five made-up worlds.
- The community seedbed reads public issues from this repository and only displays issues with a `[seed]` title prefix.
- While the page is open, the seedbed checks for new public ideas every five minutes.
- A visitor can make a portable seed card without signing in. Its text travels in the URL fragment, which browsers do not send to the site server; anyone with the link can read it, and it is not uploaded or added to the public seedbed.
- In the world forge, visitors combine one landscape, one local rule, and one welcome ritual into one of 27 illustrated pocket worlds. A world link reopens that exact world and can be changed and forwarded; its small settings payload is carried in the URL fragment without being uploaded or saved by the site.
- The recipient can forward that link, or choose to plant the seed in the public garden. Planting opens GitHub's issue composer for review and publication.
- Public ideas live in this repository's GitHub Issues, so a GitHub account is required to publish to the shared garden. A central anonymous suggestion wall would need a separate backend.

## Publish with GitHub Pages

The site has no build step. In the repository's **Settings → Pages**, choose **Deploy from a branch**, select `main`, and use `/ (root)` as the folder. The `index.html` at the project root is the entry point.

The site does not store drafts in local storage. Drafts stay in the page until a visitor chooses to create a share link or continue to GitHub.
