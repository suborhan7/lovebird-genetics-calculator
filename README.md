# Agapornis Genetic Calculator

A client-side genetic offspring calculator for *Agapornis* (lovebird) breeding.
Given the mutation genotypes of two parent birds, it predicts the phenotype
probabilities of their potential chicks.

It models:

- **Autosomal inheritance** (dominant, recessive, and co-dominant mutations)
- **Sex-linked inheritance**, including cross-over between linked genes
- Dark-factor / phase linkage and the wider mutation catalogue across the
  White Eye-Ring group, *A. roseicollis*, and *A. taranta*

A built-in **self-test panel** runs a suite of known genetic outcomes against
the calculator's logic for regression checking as the ruleset evolves.

## Stack

Pure static site — `index.html`, `style.css`, and `script.js`. No build step,
no dependencies, no backend. Open `index.html` directly in a browser or serve
the folder with any static file host.
