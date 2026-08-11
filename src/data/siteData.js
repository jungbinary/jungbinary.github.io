export const contacts = [
  {
    label: 'Email',
    href: 'mailto:jungbjun@postech.ac.kr',
    iconClass: 'fa fa-envelope',
  },
  {
    label: 'Scholar',
    href: 'https://scholar.google.com/citations?user=cQP3I7kAAAAJ&hl=ko&oi=ao',
    iconClass: 'ai ai-google-scholar',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/jungbinary',
    iconClass: 'fab fa-linkedin',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/jungbinary',
    iconClass: 'fab fa-github',
  },
]

export const publications = [
  /* {
    id: 'online-spike-and-slab',
    title: 'Fast and Scalable Online Spike-and-Slab Variational Inference',
    authors: [
      { name: 'Jungbin Jun', self: true },
      { name: 'Ilsang Ohn' },
    ],
    venue: 'In preparation, 2026',
  }, */
  {
    id: 'adaptive-bayesian-online-learning',
    title: 'Adaptive Bayesian Online Learning via Expert Aggregation',
    authors: [
      { name: 'Jungbin Jun', self: true },
      { name: 'Ilsang Ohn' },
    ],
    venue: 'Submitted, 2026',
    abstract:
      "Bayesian online learning promises uncertainty-aware prediction on data streams, but its performance hinges on inferential choices, including learning rates, prior distributions and variational families, which are usually fixed before seeing the stream. We address this by treating Bayesian update rules as experts and aggregating the Bayesian experts according to sequential predictive losses. We prove that the resulting aggregate competes with the best expert in hindsight at an aggregation cost determined by how each expert's per-round performance is evaluated. We instantiate the framework in online conformal inference and Gaussian process regression. The conformal inference application yields a smoothed Bayesian counterpart of adaptive conformal inference with long-run randomized coverage, while the Gaussian process application gives an oracle inequality in cumulative predictive Kullback-Leibler risk and adaptation to unknown Hölder smoothness up to logarithmic factors. Experiments show that the aggregate tracks strong experts without oracle expert selection.",
    links: [
      {
        label: 'arXiv',
        href: 'https://arxiv.org/abs/2607.20239',
        iconClass: 'ai ai-arxiv',
      },
    ],
  },
  {
    id: 'early-stopped-aggregation',
    title: 'Early-stopped Aggregation: Adaptive Inference with Computational Efficiency',
    authors: [
      { name: 'Ilsang Ohn' },
      { name: 'Shitao Fan' },
      { name: 'Jungbin Jun', self: true },
      { name: 'Lizhen Lin' },
    ],
    venue: 'Submitted, 2026',
    abstract:
      'When considering a model selection or, more generally, an aggregation approach for adaptive statistical inference, it is often necessary to compute estimators over a wide range of model complexities including unnecessarily large models even when the true data-generating process is relatively simple, due to the lack of prior knowledge. This requirement can lead to substantial computational inefficiency. In this work, we propose a novel framework for efficient model aggregation called the early-stopped aggregation (ESA): instead of computing and aggregating estimators for all candidate models, we compute only a small number of simpler ones using an early-stopping criterion and aggregate only these for final inference. Our framework is versatile and applies to both Bayesian model selection, in particular, within the variational Bayes framework, and frequentist estimation, including a general penalized estimation setting. We investigate adaptive optimal property of the ESA approach across three learning paradigms. We first show that ESA achieves optimal adaptive contraction rates in the variational Bayes setting under mild conditions. We extend this result to variational empirical Bayes, where prior hyperparameters are chosen in a data-dependent manner. In addition, we apply the ESA approach to frequentist aggregation including both penalization-based and sample-splitting implementations, and establish corresponding theory. As we demonstrate, there is a clear unification between early-stopped Bayes and frequentist penalized aggregation, with a common "energy" functional comprising a data-fitting term and a complexity-control term that drives both procedures. We further present several applications and numerical studies that highlight the efficiency and strong performance of the proposed approach.',
    links: [
      {
        label: 'arXiv',
        href: 'https://arxiv.org/abs/2604.14404',
        iconClass: 'ai ai-arxiv',
      },
    ],
  },
  {
    id: 'retrospective-adjustment',
    title:
      'Online Conformal Inference with Retrospective Adjustment for Faster Adaptation to Distribution Shift',
    authors: [
      { name: 'Jungbin Jun', self: true },
      { name: 'Ilsang Ohn' },
    ],
    venue: 'Pattern Recognition, 2026',
    abstract:
      'Conformal prediction has emerged as a powerful framework for constructing distribution-free prediction sets with guaranteed coverage assuming only the exchangeability assumption. However, this assumption is often violated in online environments where data distributions evolve over time. Several recent approaches have been proposed to address this limitation, but, typically, they slowly adapt to distribution shifts because they update predictions only in a forward manner, that is, they generate a prediction for a newly observed data point while previously computed predictions are not updated. In this paper, we propose a novel online conformal inference method with retrospective adjustment, which is designed to achieve faster adaptation to distributional shifts. Our method leverages regression approaches with efficient leave-one-out update formulas to retroactively adjust past predictions when new data arrive, thereby aligning the entire set of predictions with the most recent data distribution. Through extensive numerical studies performed on both synthetic and real-world data sets, we show that the proposed approach achieves faster coverage recalibration and improved statistical efficiency compared to existing online conformal prediction methods.',
    links: [
      {
        label: 'paper',
        href: 'https://www.sciencedirect.com/science/article/abs/pii/S0031320326013713',
        iconClass: 'fa fa-file-lines',
      },
      {
        label: 'arXiv',
        href: 'https://arxiv.org/abs/2511.04275',
        iconClass: 'ai ai-arxiv',
      },
      {
        label: 'code',
        href: 'https://github.com/jungbinary/OnlineConformalRetroAdj',
        iconClass: 'fab fa-github',
      },
    ],
  },
]

export const education = [
  {
    title: 'Pohang University of Science and Technology',
    subtitle: 'M.S. in Artificial Intelligence',
    date: 'Sep 2026 - Present',
    location: 'Pohang, KR',
    details: [
      {
        iconClass: 'fa fa-user-tie',
        text: 'Advisor: ',
        link: {
          label: 'Sangdon Park',
          href: 'https://sangdon.github.io',
        },
      },
    ],
  },
  {
    title: 'Inha University',
    subtitle: 'B.S. in Statistics',
    date: 'Mar 2022 – Aug 2026',
    location: 'Incheon, KR',
    details: [
      {
        iconClass: 'fa fa-award',
        text: 'Grade: 4.42 / 4.5 (Rank: 1/41, Major: 4.48)',
      },
      {
        iconClass: 'fa fa-graduation-cap',
        text: 'Graduated in 6 semesters',
      },
      {
        iconClass: 'fa fa-user-tie',
        text: 'Advisor: ',
        link: {
          label: 'Ilsang Ohn',
          href: 'https://sites.google.com/view/iohn/home',
        },
      },
    ],
  },
]

export const experience = [
  {
    title: 'National Institute of Environmental Human Resources Development',
    subtitle: 'Teaching Assistant',
    date: 'Feb 2025; Aug 2025',
    location: 'Incheon, KR',
  },
  {
    title: 'Korean Augmentation to the U.S. Army (KATUSA)',
    subtitle: 'Sergeant, 188th Military Police Company',
    date: 'Aug 2023 – Feb 2025',
    location: 'Daegu, KR',
  },
]

export const awards = [
  {
    title: 'Hanjin Group Scholarship',
    date: '2026',
    items: [
      'Inha University; awarded to the top-ranked student in the department.',
    ],
  },
  {
    title: 'Academic Excellence Scholarship',
    date: '2023, 2025',
    items: ['Inha University'],
  },
]
