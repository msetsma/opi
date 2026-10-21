# Decisions

Why opi is set up the way it is. The roadmap is in [pi-my-plan.md](pi-my-plan.md) and the change list is in [FORK.md](FORK.md).

## `main` is the fork, not a mirror of upstream

The fork started with `main` as a pristine copy of upstream and a separate `my` branch for our changes. That put the fork's README, changes and history on a branch nobody lands on, and GitHub showed the stock upstream project.

Now `main` is upstream plus our changes and is the default branch, so the repo page describes what the fork is. Upstream stays reachable as the `upstream` remote. We merge `upstream/main` into `main` instead of rebasing, because `main` is public and merges let `rerere` replay conflict resolutions on later syncs.

Feature branches are still cut from `upstream/main`, not from our `main`. That keeps each one free of fork-only commits, so it can go upstream as a PR without cleanup.

## Core gets small hooks, extensions get the policy

Leader keys, statusline layout and the outline panel live in separate extension repos ([pi-leader](https://github.com/msetsma/pi-leader), [pi-statusline](https://github.com/msetsma/pi-statusline), [pi-outline](https://github.com/msetsma/pi-outline)). The core only gains generic hooks, such as widget placements and shortcut ids, and each hook should make sense to upstream on its own.

Upstream merged about 500 commits in a month, and `interactive-mode.ts` alone took 38 of them. Every opinion we put in the core is a recurring merge conflict. A hook is small and stable, and opinions in an extension never conflict.

## Reuse upstream work

Editor border widgets come from upstream PR #10602, cherry-picked, because every widget and statusline feature builds on its single widget map. Writing a competing version would diverge for no gain. If upstream revises the PR, we re-cherry-pick.

## Fixes first

Two bugs and one performance problem turned up during research: the overlay close bug, the HStack double render and the wheel overscroll leak. They are the easiest upstream PRs, they need no new API, and they unblock the later work. They are also the best way to build trust with the maintainers before proposing larger features.

## Shared config directory

The fork uses the normal `~/.pi/agent` and not a separate directory. Settings, auth and sessions carry over with no setup. The cost is that a stock `pi` also loads our extensions and may render fork-only placements in the wrong spot. We accepted that for a personal daily driver.

## Upstream contribution rules

Upstream auto-closes issues and PRs from new contributors. Each proposal is a short issue in our own words, and a PR follows only after a maintainer replies `lgtm`. Bug fixes go first.

## Name

The repo is named `opi`, for opinionated pi. The fork is expected to grow its own defaults and features, so it is no longer a staging area for upstream patches. The name is short enough to double as a command if we ship our own binary.

GitHub Actions stay disabled. Upstream's issue and PR gate workflows would misfire on a fork.
