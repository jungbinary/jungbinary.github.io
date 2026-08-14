---
title: Bayesian Perspective of Universal Portfolios
description: A Bayesian interpretation of universal portfolio selection and its empirical Bayes extension.
date: 2026-08-14
displayDate: August 14, 2026
updated: August 14, 2026
author: Jungbin Jun
topics:
  - Online Learning
draft: false
---

Let \\(X \in \mathbb{R}_+^m\\) denote a stock market vector, and let \\(\lambda \in \Delta^m\\) denote a portfolio. Given a portfolio \\(\lambda\\), the investor's one-period wealth is given by

<div class="blog-equation">
$$
W(\lambda) = \lambda^\top X.
$$
</div>

Now consider a sequence of stock market vectors \\(\lbrace X_t \rbrace_{t \in [T]}\\). The wealth accumulated by a fixed portfolio \\(\lambda\\) over \\(T\\) periods is

<div class="blog-equation">
$$
W_T(\lambda)
=
\prod_{t=1}^T \lambda^\top X_t.
$$
</div>

The \\(\mu\\)-weighted universal portfolio at time \\(t\\) is defined as

<div class="blog-equation">
$$
\bar{\lambda}_t
=
\frac{
\int_{\Delta^m} \lambda W_{t-1}(\lambda)\, d\mu(\lambda)
}{
\int_{\Delta^m} W_{t-1}(\lambda)\, d\mu(\lambda)
}.
$$
</div>

We may define a distribution \\(q_t\\) over portfolios as

<div class="blog-equation">
$$
q_t(\lambda)
\propto
W_{t-1}(\lambda)\,\mu(\lambda).
$$
</div>

Under this interpretation, \\(W_{t-1}(\lambda)\\) plays the role of a likelihood, while \\(\mu(\lambda)\\) plays the role of a prior distribution.

Indeed, letting

<div class="blog-equation">
$$
Z_t
=
\int_{\Delta^m} W_{t-1}(\lambda)\,d\mu(\lambda),
$$
</div>

we have

<div class="blog-equation">
$$
\mathbb{E}_{\lambda \sim q_t}[\lambda]
=
\frac{1}{Z_t}
\int_{\Delta^m}
\lambda W_{t-1}(\lambda)\,d\mu(\lambda)
=
\bar{\lambda}_t.
$$
</div>

Thus, the universal portfolio \\(\bar{\lambda}_t\\) can be interpreted as the posterior mean under \\(q_t\\). From this perspective, universal portfolio selection admits a natural interpretation as a form of online Bayes.

## Empirical Bayes

O&#39;Sullivan et al. <a href="#ref1" class="reference-link">[1]</a> proposed an adaptive universal portfolio of the form

<div class="blog-equation">
$$
\tilde{\lambda}_t
=
\frac{
\int_{\Delta^m}
\lambda \alpha_t(\lambda) W_{t-1}(\lambda)\,d\lambda
}{
\int_{\Delta^m}
\alpha_t(\lambda) W_{t-1}(\lambda)\,d\lambda
},
$$
</div>

where \\(\alpha_t : (\Delta^m, \lbrace X_j \rbrace_{j \in [t-1]}) \to (0,1)\\) is chosen to be a non-decreasing function of the past wealth \\(W_{t-1}(\lambda)\\).

The factor \\(\alpha_t(\lambda)\\) can be viewed as inducing a data-dependent prior over portfolios. Consequently, the adaptive universal portfolio \\(\tilde{\lambda}_t\\) admits an empirical Bayes interpretation: the prior distribution is adapted using the observed market history, and the resulting portfolio is the posterior mean under this data-dependent prior.

I am not yet sure how useful this perspective will be, but I believe it may lead to interesting insights.

<section class="blog-references" aria-labelledby="references">
  <h2 id="references">References</h2>
  <ol>
    <li id="ref1">
      <span>[1]</span>
      <span>O'Sullivan, Patrick, and David Edelman. "Adaptive universal portfolios." <em>The European Journal of Finance</em> 21.4 (2015): 337–351.</span>
    </li>
  </ol>
</section>
