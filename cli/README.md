# calc — terminal access to calc.fatfort.com

Two ways to reach the calculators, for two different audiences:

| | Who it's for | What it is |
|---|---|---|
| **`../mcp/`** | Claude (Claude Code, Claude Desktop) | An MCP server — lets an AI client call the calculators as tools |
| **this directory** | You, at a keyboard | A CLI plus tmux / sesh / Television wiring |

They aren't alternatives; MCP does not give *you* a prompt, and the CLI does not
give *Claude* tools. Both wrap the same public HTTP API.

## Install

Everything here needs only **bash, curl and jq** — no runtime, so it works on a
stock macOS shell and inside a tmux popup.

```sh
# 1. Put the two scripts on PATH
ln -s "$PWD/calc"     ~/.local/bin/calc
ln -s "$PWD/calc-run" ~/.local/bin/calc-run

# 2. Television channel (optional)
mkdir -p ~/.config/television/cable
cp television-calc.toml ~/.config/television/cable/calc.toml

# 3. sesh sessions (optional) — merge into your existing file
cat sesh.toml >> ~/.config/sesh/sesh.toml

# 4. tmux bindings (optional)
cat tmux.conf >> ~/.tmux.conf && tmux source-file ~/.tmux.conf
```

On the Mac: `brew install jq fzf tmux` and, for the optional pieces,
`brew install sesh television`. Apple ships no tmux — check `tmux -V` gives 3.2
or newer, or `display-popup` won't exist.

## The CLI

```sh
calc gcd 12 18                      # 6
calc quadratic-solver 1 -3 2        # {"discriminant":1,"realRoots":[2,1]}
calc base-converter 255 10 16       # "FF"
calc matrix-determinant '[[1,2],[3,4]]'
calc gaussian-elimination '[[2,1],[1,3]]' '[5,10]'

calc list                           # name<TAB>summary, one per line
calc describe factorial             # arguments, limits, and why the limit exists
calc raw gcd '{"a":12,"b":18}'      # send a body verbatim
```

Arguments are positional, in the order `calc describe` prints them. Types are
enforced client-side, so a typo fails instantly instead of returning the API's
generic `Invalid input`.

`CALC_API` picks the target — default `https://calc.fatfort.com/api`; set
`http://127.0.0.1:27439/api` to hit a container on the same machine.
`CALC_TIMEOUT` (default 15s) bounds the request.

### Why the limits are explained, not just enforced

Several endpoints have ceilings, and a bare rejection is unhelpful. `calc`
repeats the reason on failure:

```
$ calc factorial 100
calc: n must be between 0 and 20; 21! overflows a 64-bit integer
      n must be 0..20 — 21! overflows a 64-bit integer.
```

These mirror the constants in `../backend/main.go`. If you change a bound there,
change `bounds_for()` here too — they are deliberately duplicated so the CLI can
explain a failure without a round trip, and nothing enforces that they agree.

## Television

`tv calc` fuzzy-finds across both endpoint names and descriptions, previews the
selected one's arguments and limits, and runs it on `ctrl-r`. Enter keeps its
default behaviour (print the selection) so `tv calc` still works in a pipeline.
`f4` jumps to the channel from anywhere in tv.

The channel passes `{}` — the whole selected line — straight to `calc describe`
and `calc-run`, both of which take the first field themselves. That avoids
Television's `{split:...}` placeholder, where a tab inside a TOML string is
ambiguous between an escape sequence and a literal.

## tmux

| Binding | Does |
|---|---|
| `prefix + c` | Calculator picker in a popup (Television, or fzf if absent) |
| `prefix + C` | Same, against a local container instead of production |
| `prefix + S` | sesh session switcher |
| `prefix + M-c` | Prompt for one `calc …` line, show the answer in a popup |

`prefix + c` **overrides tmux's default `new-window`.** Rebind it if you'd rather
keep that — the popup is the only binding here that shadows a default.

Every binding degrades to fzf when Television isn't installed, so the same
config works on a machine that has only the basics.

## sesh

`sesh connect calc` opens a tmux session in the checkout with the picker already
running. `calc-local` is the same thing pointed at `127.0.0.1:27439` — useful
while changing `backend/main.go`. Adjust the `path` fields to match where you
actually keep these repos; they're guesses.

## Endpoint reference

`calc list` is the authoritative list — it's generated from the same manifest
the CLI dispatches on. Field names came from the `json:` tags in
`../backend/main.go` and several are not guessable: `base-converter` takes
`value` (not `number`), and `data-size-convert` takes one `unit` and returns all
six at once. The repo README had two of them wrong; trust `calc describe`.
