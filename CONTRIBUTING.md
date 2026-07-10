# Contributing to Jules MCP Server

First off, thank you for considering contributing to Jules MCP Server! It's people like you that make it a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make one! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

## Fork & create a branch

If this is something you think you can fix, then fork Jules MCP Server and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

`git checkout -b 325-add-new-mcp-tool`

## Getting Started

Make sure you have Node.js installed.
Install dependencies before you start developing:

npm install

## Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first.

## Make a Pull Request

At this point, you should switch back to your main branch and make sure it's up to date with Jules MCP Server's main branch:

`git remote add upstream git@github.com:SpiffyNyanXD/jules-mcp-server.git`
`git checkout main`
`git fetch upstream`
`git rebase upstream/main`

Then update your feature branch from your local copy of main, and push it!

`git checkout 325-add-new-mcp-tool`
`git rebase main`

Finally, go to GitHub and make a Pull Request!

## Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

## Merging A PR (maintainers only)

A PR can only be merged into main by a maintainer if:

* It is passing CI.
* It has been approved by at least one maintainer.
* It has no requested changes.
* It is up to date with current main.

Any maintainer is allowed to merge a PR if all of these conditions are met.
