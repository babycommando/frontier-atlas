export type ArxivCategory = {
  code: string;
  title: string;
  badgeLabel: string;
  archiveCode: string;
  archiveTitle: string;
  group: string;
  description: string;
  canonicalCode?: string;
};

const category = (value: ArxivCategory) => value;

export const ARXIV_CATEGORIES = [
  // Physics -> Astrophysics
  category({
    code: "astro-ph.CO",
    title: "Cosmology and Nongalactic Astrophysics",
    badgeLabel: "Cosmology and Nongalactic Astrophysics",
    archiveCode: "astro-ph",
    archiveTitle: "Astrophysics",
    group: "Physics",
    description:
      "Early universe, CMB, large-scale structure, dark matter, dark energy, inflation, primordial black holes, and cosmological gravitational radiation.",
  }),
  category({
    code: "astro-ph.EP",
    title: "Earth and Planetary Astrophysics",
    badgeLabel: "Earth and Planetary Astrophysics",
    archiveCode: "astro-ph",
    archiveTitle: "Astrophysics",
    group: "Physics",
    description:
      "Planetary physics, astrobiology, exoplanets, comets, asteroids, meteorites, and solar system structure and formation.",
  }),
  category({
    code: "astro-ph.GA",
    title: "Astrophysics of Galaxies",
    badgeLabel: "Astrophysics of Galaxies",
    archiveCode: "astro-ph",
    archiveTitle: "Astrophysics",
    group: "Physics",
    description:
      "Galaxies, the Milky Way, interstellar medium, stellar populations, galactic structure, AGN, quasars, and gravitational lens systems.",
  }),
  category({
    code: "astro-ph.HE",
    title: "High Energy Astrophysical Phenomena",
    badgeLabel: "High Energy Astrophysical Phenomena",
    archiveCode: "astro-ph",
    archiveTitle: "Astrophysics",
    group: "Physics",
    description:
      "Cosmic ray production, acceleration, propagation, detection, gamma ray astronomy, X-rays, supernovae, stellar remnants, jets, neutron stars, pulsars, and black holes.",
  }),
  category({
    code: "astro-ph.IM",
    title: "Instrumentation and Methods for Astrophysics",
    badgeLabel: "Instrumentation and Methods for Astrophysics",
    archiveCode: "astro-ph",
    archiveTitle: "Astrophysics",
    group: "Physics",
    description:
      "Detector and telescope design, experiment proposals, laboratory astrophysics, methods for data analysis, statistical methods, software, and database design.",
  }),
  category({
    code: "astro-ph.SR",
    title: "Solar and Stellar Astrophysics",
    badgeLabel: "Solar and Stellar Astrophysics",
    archiveCode: "astro-ph",
    archiveTitle: "Astrophysics",
    group: "Physics",
    description:
      "White dwarfs, brown dwarfs, cataclysmic variables, star formation, protostellar systems, stellar evolution and structure, coronas, helioseismology, and solar neutrinos.",
  }),

  // Physics -> Condensed Matter
  category({
    code: "cond-mat.dis-nn",
    title: "Disordered Systems and Neural Networks",
    badgeLabel: "Disordered Systems and Neural Networks",
    archiveCode: "cond-mat",
    archiveTitle: "Condensed Matter",
    group: "Physics",
    description:
      "Glasses and spin glasses, random and quasiperiodic systems, transport in disordered media, localization, defect-mediated phenomena, and neural networks.",
  }),
  category({
    code: "cond-mat.mes-hall",
    title: "Mesoscale and Nanoscale Physics",
    badgeLabel: "Mesoscale and Nanoscale Physics",
    archiveCode: "cond-mat",
    archiveTitle: "Condensed Matter",
    group: "Physics",
    description:
      "Quantum dots, wires and wells, single electronics, spintronics, quantum Hall effect, nanotubes, graphene, and plasmonic nanostructures.",
  }),
  category({
    code: "cond-mat.mtrl-sci",
    title: "Materials Science",
    badgeLabel: "Materials Science",
    archiveCode: "cond-mat",
    archiveTitle: "Condensed Matter",
    group: "Physics",
    description:
      "Synthesis, characterization, structure, phase transitions, mechanical properties, phonons, defects, adsorbates, and interfaces.",
  }),
  category({
    code: "cond-mat.other",
    title: "Other Condensed Matter",
    badgeLabel: "Other Condensed Matter",
    archiveCode: "cond-mat",
    archiveTitle: "Condensed Matter",
    group: "Physics",
    description:
      "Work in condensed matter that does not fit into the other condensed matter classifications.",
  }),
  category({
    code: "cond-mat.quant-gas",
    title: "Quantum Gases",
    badgeLabel: "Quantum Gases",
    archiveCode: "cond-mat",
    archiveTitle: "Condensed Matter",
    group: "Physics",
    description:
      "Ultracold atomic and molecular gases, Bose-Einstein condensation, Feshbach resonances, optical lattices, and quantum simulation with cold atoms and molecules.",
  }),
  category({
    code: "cond-mat.soft",
    title: "Soft Condensed Matter",
    badgeLabel: "Soft Condensed Matter",
    archiveCode: "cond-mat",
    archiveTitle: "Condensed Matter",
    group: "Physics",
    description:
      "Membranes, polymers, liquid crystals, glasses, colloids, and granular matter.",
  }),
  category({
    code: "cond-mat.stat-mech",
    title: "Statistical Mechanics",
    badgeLabel: "Statistical Mechanics",
    archiveCode: "cond-mat",
    archiveTitle: "Condensed Matter",
    group: "Physics",
    description:
      "Phase transitions, thermodynamics, field theory, non-equilibrium phenomena, renormalization group, scaling, integrable models, and turbulence.",
  }),
  category({
    code: "cond-mat.str-el",
    title: "Strongly Correlated Electrons",
    badgeLabel: "Strongly Correlated Electrons",
    archiveCode: "cond-mat",
    archiveTitle: "Condensed Matter",
    group: "Physics",
    description:
      "Quantum magnetism, non-Fermi liquids, spin liquids, quantum criticality, charge density waves, and metal-insulator transitions.",
  }),
  category({
    code: "cond-mat.supr-con",
    title: "Superconductivity",
    badgeLabel: "Superconductivity",
    archiveCode: "cond-mat",
    archiveTitle: "Condensed Matter",
    group: "Physics",
    description:
      "Superconductivity theory, models, experiment, and superflow in helium.",
  }),

  // Physics -> Core archives
  category({
    code: "gr-qc",
    title: "General Relativity and Quantum Cosmology",
    badgeLabel: "General Relativity and Quantum Cosmology",
    archiveCode: "gr-qc",
    archiveTitle: "General Relativity and Quantum Cosmology",
    group: "Physics",
    description:
      "Areas of gravitational physics, including gravitational waves, tests of gravitational theories, computational general relativity, relativistic astrophysics, cosmology, and quantum gravity.",
  }),
  category({
    code: "hep-ex",
    title: "High Energy Physics - Experiment",
    badgeLabel: "High Energy Physics - Experiment",
    archiveCode: "hep-ex",
    archiveTitle: "High Energy Physics",
    group: "Physics",
    description:
      "Results from high-energy and particle physics experiments, including standard model tests, parameter measurements, searches beyond the standard model, and astroparticle experimental results.",
  }),
  category({
    code: "hep-lat",
    title: "High Energy Physics - Lattice",
    badgeLabel: "High Energy Physics - Lattice",
    archiveCode: "hep-lat",
    archiveTitle: "High Energy Physics",
    group: "Physics",
    description:
      "Lattice field theory, phenomenology from lattice field theory, algorithms for lattice field theory, and hardware for lattice methods.",
  }),
  category({
    code: "hep-ph",
    title: "High Energy Physics - Phenomenology",
    badgeLabel: "High Energy Physics - Phenomenology",
    archiveCode: "hep-ph",
    archiveTitle: "High Energy Physics",
    group: "Physics",
    description:
      "Theoretical particle physics and its interrelation with experiment, including observables, models, effective field theories, and theory tested through experimental results.",
  }),
  category({
    code: "hep-th",
    title: "High Energy Physics - Theory",
    badgeLabel: "High Energy Physics - Theory",
    archiveCode: "hep-th",
    archiveTitle: "High Energy Physics",
    group: "Physics",
    description:
      "Formal aspects of quantum field theory, string theory, supersymmetry, and supergravity.",
  }),
  category({
    code: "math-ph",
    title: "Mathematical Physics",
    badgeLabel: "Mathematical Physics (Physics)",
    archiveCode: "math-ph",
    archiveTitle: "Mathematical Physics",
    group: "Physics",
    description:
      "Research illustrating the application of mathematics to physics, mathematical methods for such applications, and mathematically rigorous formulations of physical theories.",
  }),
  category({
    code: "math.MP",
    title: "Mathematical Physics",
    badgeLabel: "Mathematical Physics (Mathematics)",
    archiveCode: "math",
    archiveTitle: "Mathematics",
    group: "Mathematics",
    canonicalCode: "math-ph",
    description:
      "Alias of math-ph. Research illustrating the application of mathematics to physics, mathematical methods for such applications, and mathematically rigorous formulations of physical theories.",
  }),
  category({
    code: "nlin.AO",
    title: "Adaptation and Self-Organizing Systems",
    badgeLabel: "Adaptation and Self-Organizing Systems",
    archiveCode: "nlin",
    archiveTitle: "Nonlinear Sciences",
    group: "Physics",
    description:
      "Adaptation, self-organizing systems, statistical physics, fluctuating systems, stochastic processes, interacting particle systems, and machine learning.",
  }),
  category({
    code: "nlin.CD",
    title: "Chaotic Dynamics",
    badgeLabel: "Chaotic Dynamics",
    archiveCode: "nlin",
    archiveTitle: "Nonlinear Sciences",
    group: "Physics",
    description:
      "Dynamical systems, chaos, quantum chaos, topological dynamics, cycle expansions, turbulence, and propagation.",
  }),
  category({
    code: "nlin.CG",
    title: "Cellular Automata and Lattice Gases",
    badgeLabel: "Cellular Automata and Lattice Gases",
    archiveCode: "nlin",
    archiveTitle: "Nonlinear Sciences",
    group: "Physics",
    description:
      "Computational methods, time series analysis, signal processing, wavelets, and lattice gases.",
  }),
  category({
    code: "nlin.PS",
    title: "Pattern Formation and Solitons",
    badgeLabel: "Pattern Formation and Solitons",
    archiveCode: "nlin",
    archiveTitle: "Nonlinear Sciences",
    group: "Physics",
    description: "Pattern formation, coherent structures, and solitons.",
  }),
  category({
    code: "nlin.SI",
    title: "Exactly Solvable and Integrable Systems",
    badgeLabel: "Exactly Solvable and Integrable Systems",
    archiveCode: "nlin",
    archiveTitle: "Nonlinear Sciences",
    group: "Physics",
    description:
      "Exactly solvable systems, integrable partial differential equations, integrable ordinary differential equations, Painleve analysis, solvable lattice models, and integrable quantum systems.",
  }),
  category({
    code: "nucl-ex",
    title: "Nuclear Experiment",
    badgeLabel: "Nuclear Experiment",
    archiveCode: "nucl-ex",
    archiveTitle: "Nuclear Physics",
    group: "Physics",
    description:
      "Results from experimental nuclear physics, including fundamental interactions, low and medium energy measurements, and relativistic heavy-ion collisions.",
  }),
  category({
    code: "nucl-th",
    title: "Nuclear Theory",
    badgeLabel: "Nuclear Theory",
    archiveCode: "nucl-th",
    archiveTitle: "Nuclear Physics",
    group: "Physics",
    description:
      "Theory of nuclear structure, hadron structure, neutron stars, equations of state, and nuclear reactions at low and high energies.",
  }),
  category({
    code: "quant-ph",
    title: "Quantum Physics",
    badgeLabel: "Quantum Physics",
    archiveCode: "quant-ph",
    archiveTitle: "Quantum Physics",
    group: "Physics",
    description:
      "Quantum information, quantum foundations, simulation, measurement, and broader quantum systems research.",
  }),

  // Mathematics
  category({
    code: "math.AG",
    title: "Algebraic Geometry",
    badgeLabel: "Algebraic Geometry",
    archiveCode: "math",
    archiveTitle: "Mathematics",
    group: "Mathematics",
    description:
      "Algebraic varieties, stacks, sheaves, schemes, moduli spaces, complex geometry, and quantum cohomology.",
  }),
  category({
    code: "math.AP",
    title: "Analysis of PDEs",
    badgeLabel: "Analysis of Partial Differential Equations",
    archiveCode: "math",
    archiveTitle: "Mathematics",
    group: "Mathematics",
    description:
      "Existence and uniqueness, boundary conditions, linear and nonlinear operators, stability, soliton theory, integrable partial differential equations, conservation laws, and qualitative dynamics.",
  }),
  category({
    code: "math.CO",
    title: "Combinatorics",
    badgeLabel: "Combinatorics",
    archiveCode: "math",
    archiveTitle: "Mathematics",
    group: "Mathematics",
    description:
      "Discrete mathematics, graph theory, enumeration, combinatorial optimization, Ramsey theory, and combinatorial game theory.",
  }),
  category({
    code: "math.DG",
    title: "Differential Geometry",
    badgeLabel: "Differential Geometry",
    archiveCode: "math",
    archiveTitle: "Mathematics",
    group: "Mathematics",
    description:
      "Complex, contact, Riemannian, pseudo-Riemannian and Finsler geometry, relativity, gauge theory, and global analysis.",
  }),
  category({
    code: "math.NA",
    title: "Numerical Analysis",
    badgeLabel: "Numerical Analysis (Mathematics)",
    archiveCode: "math",
    archiveTitle: "Mathematics",
    group: "Mathematics",
    description:
      "Numerical algorithms for problems in analysis and algebra, and scientific computation.",
  }),
  category({
    code: "cs.NA",
    title: "Numerical Analysis",
    badgeLabel: "Numerical Analysis (Computer Science)",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    canonicalCode: "math.NA",
    description:
      "Alias of math.NA. Numerical algorithms for problems in analysis and algebra, and scientific computation.",
  }),
  category({
    code: "math.OC",
    title: "Optimization and Control",
    badgeLabel: "Optimization and Control",
    archiveCode: "math",
    archiveTitle: "Mathematics",
    group: "Mathematics",
    description:
      "Operations research, linear programming, control theory, systems theory, optimal control, and game theory.",
  }),
  category({
    code: "math.PR",
    title: "Probability",
    badgeLabel: "Probability",
    archiveCode: "math",
    archiveTitle: "Mathematics",
    group: "Mathematics",
    description:
      "Theory and applications of probability and stochastic processes, including central limit theorems, large deviations, stochastic differential equations, and queueing theory.",
  }),
  category({
    code: "math.QA",
    title: "Quantum Algebra",
    badgeLabel: "Quantum Algebra",
    archiveCode: "math",
    archiveTitle: "Mathematics",
    group: "Mathematics",
    description:
      "Quantum groups, skein theories, operadic and diagrammatic algebra, and quantum field theory connections.",
  }),
  category({
    code: "math.ST",
    title: "Statistics Theory",
    badgeLabel: "Statistics Theory (Mathematics)",
    archiveCode: "math",
    archiveTitle: "Mathematics",
    group: "Mathematics",
    description:
      "Applied, computational and theoretical statistics, including inference, regression, time series, multivariate analysis, MCMC, and design of experiments.",
  }),
  category({
    code: "stat.TH",
    title: "Statistics Theory",
    badgeLabel: "Statistics Theory (Statistics)",
    archiveCode: "stat",
    archiveTitle: "Statistics",
    group: "Statistics",
    canonicalCode: "math.ST",
    description:
      "Alias of math.ST. Asymptotics, Bayesian inference, decision theory, estimation, foundations, inference, and testing.",
  }),

  // Computer Science
  category({
    code: "cs.AI",
    title: "Artificial Intelligence",
    badgeLabel: "Artificial Intelligence",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    description:
      "AI beyond the more specialized subject areas, including expert systems, theorem proving, knowledge representation, planning, and uncertainty in artificial intelligence.",
  }),
  category({
    code: "cs.CL",
    title: "Computation and Language",
    badgeLabel: "Computation and Language",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    description: "Natural language processing and computational linguistics.",
  }),
  category({
    code: "cs.CR",
    title: "Cryptography and Security",
    badgeLabel: "Cryptography and Security",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    description:
      "All areas of cryptography and security, including authentication and public-key cryptosystems.",
  }),
  category({
    code: "cs.CV",
    title: "Computer Vision and Pattern Recognition",
    badgeLabel: "Computer Vision and Pattern Recognition",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    description:
      "Image processing, computer vision, pattern recognition, and scene understanding.",
  }),
  category({
    code: "cs.DB",
    title: "Databases",
    badgeLabel: "Databases",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    description: "Database management, data mining, and data processing.",
  }),
  category({
    code: "cs.DC",
    title: "Distributed, Parallel, and Cluster Computing",
    badgeLabel: "Distributed, Parallel, and Cluster Computing",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    description:
      "Fault-tolerance, distributed algorithms, parallel computation, and cluster computing.",
  }),
  category({
    code: "cs.IR",
    title: "Information Retrieval",
    badgeLabel: "Information Retrieval",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    description: "Indexing, dictionaries, retrieval, content, and analysis.",
  }),
  category({
    code: "cs.LG",
    title: "Machine Learning",
    badgeLabel: "Machine Learning (Computer Science)",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    description:
      "All aspects of machine learning research, including supervised learning, unsupervised learning, reinforcement learning, bandits, robustness, explanation, fairness, and methodology.",
  }),
  category({
    code: "cs.RO",
    title: "Robotics",
    badgeLabel: "Robotics",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    description:
      "Robotics theory, systems, perception, planning, and applications.",
  }),
  category({
    code: "cs.SE",
    title: "Software Engineering",
    badgeLabel: "Software Engineering",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    description:
      "Design tools, software metrics, testing and debugging, programming environments, and related software engineering practice.",
  }),
  category({
    code: "cs.SY",
    title: "Systems and Control",
    badgeLabel: "Systems and Control (Computer Science)",
    archiveCode: "cs",
    archiveTitle: "Computer Science",
    group: "Computer Science",
    canonicalCode: "eess.SY",
    description:
      "Alias of eess.SY. Automatic control systems, methods of analysis and design, modeling, simulation, optimization, and cyber-physical applications.",
  }),

  // Quantitative Biology
  category({
    code: "q-bio.BM",
    title: "Biomolecules",
    badgeLabel: "Biomolecules",
    archiveCode: "q-bio",
    archiveTitle: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "DNA, RNA, proteins, lipids, molecular structures and folding kinetics, molecular interactions, and single-molecule manipulation.",
  }),
  category({
    code: "q-bio.CB",
    title: "Cell Behavior",
    badgeLabel: "Cell Behavior",
    archiveCode: "q-bio",
    archiveTitle: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "Cell-cell signaling and interaction, morphogenesis and development, apoptosis, bacterial conjugation, viral-host interaction, and immunology.",
  }),
  category({
    code: "q-bio.GN",
    title: "Genomics",
    badgeLabel: "Genomics",
    archiveCode: "q-bio",
    archiveTitle: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "DNA sequencing and assembly, gene and motif finding, RNA editing, alternative splicing, genomic structure, replication, transcription, methylation, and mutational processes.",
  }),
  category({
    code: "q-bio.MN",
    title: "Molecular Networks",
    badgeLabel: "Molecular Networks",
    archiveCode: "q-bio",
    archiveTitle: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "Gene regulation, signal transduction, proteomics, metabolomics, and gene and enzymatic networks.",
  }),
  category({
    code: "q-bio.NC",
    title: "Neurons and Cognition",
    badgeLabel: "Neurons and Cognition",
    archiveCode: "q-bio",
    archiveTitle: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "Synapse, cortex, neuronal dynamics, neural networks, sensorimotor control, behavior, and attention.",
  }),
  category({
    code: "q-bio.OT",
    title: "Other Quantitative Biology",
    badgeLabel: "Other Quantitative Biology",
    archiveCode: "q-bio",
    archiveTitle: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "Work in quantitative biology that does not fit into the other quantitative biology classifications.",
  }),
  category({
    code: "q-bio.PE",
    title: "Populations and Evolution",
    badgeLabel: "Populations and Evolution",
    archiveCode: "q-bio",
    archiveTitle: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "Population dynamics, spatio-temporal and epidemiological models, dynamic speciation, co-evolution, biodiversity, foodwebs, aging, molecular evolution, phylogeny, directed evolution, and origin of life.",
  }),
  category({
    code: "q-bio.QM",
    title: "Quantitative Methods",
    badgeLabel: "Quantitative Methods",
    archiveCode: "q-bio",
    archiveTitle: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "All experimental, numerical, statistical and mathematical contributions of value to biology.",
  }),
  category({
    code: "q-bio.SC",
    title: "Subcellular Processes",
    badgeLabel: "Subcellular Processes",
    archiveCode: "q-bio",
    archiveTitle: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "Assembly and control of subcellular structures, molecular motors, transport, subcellular localization, mitosis, and meiosis.",
  }),
  category({
    code: "q-bio.TO",
    title: "Tissues and Organs",
    badgeLabel: "Tissues and Organs",
    archiveCode: "q-bio",
    archiveTitle: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "Blood flow in vessels, biomechanics of bones, electrical waves, endocrine system, and tumor growth.",
  }),

  // Statistics
  category({
    code: "stat.AP",
    title: "Applications",
    badgeLabel: "Applications (Statistics)",
    archiveCode: "stat",
    archiveTitle: "Statistics",
    group: "Statistics",
    description:
      "Biology, education, epidemiology, engineering, environmental sciences, medical sciences, physical sciences, quality control, and social sciences.",
  }),
  category({
    code: "stat.CO",
    title: "Computation",
    badgeLabel: "Computation (Statistics)",
    archiveCode: "stat",
    archiveTitle: "Statistics",
    group: "Statistics",
    description: "Algorithms, simulation, and visualization.",
  }),
  category({
    code: "stat.ME",
    title: "Methodology",
    badgeLabel: "Methodology (Statistics)",
    archiveCode: "stat",
    archiveTitle: "Statistics",
    group: "Statistics",
    description:
      "Design, surveys, model selection, multiple testing, multivariate methods, signal and image processing, time series, smoothing, spatial statistics, survival analysis, and nonparametric methods.",
  }),
  category({
    code: "stat.ML",
    title: "Machine Learning",
    badgeLabel: "Machine Learning (Statistics)",
    archiveCode: "stat",
    archiveTitle: "Statistics",
    group: "Statistics",
    description:
      "Machine learning papers with a statistical or theoretical grounding, including supervised, unsupervised, semi-supervised learning, graphical models, reinforcement learning, bandits, and high-dimensional inference.",
  }),
  category({
    code: "stat.OT",
    title: "Other Statistics",
    badgeLabel: "Other Statistics",
    archiveCode: "stat",
    archiveTitle: "Statistics",
    group: "Statistics",
    description:
      "Work in statistics that does not fit into the other statistics classifications.",
  }),

  // Electrical Engineering and Systems Science
  category({
    code: "eess.AS",
    title: "Audio and Speech Processing",
    badgeLabel: "Audio and Speech Processing",
    archiveCode: "eess",
    archiveTitle: "Electrical Engineering and Systems Science",
    group: "Electrical Engineering and Systems Science",
    description:
      "Audio, speech, and language signal processing, including analysis, synthesis, enhancement, recognition, source separation, acoustic modeling, speech understanding, and related machine learning methods.",
  }),
  category({
    code: "eess.IV",
    title: "Image and Video Processing",
    badgeLabel: "Image and Video Processing",
    archiveCode: "eess",
    archiveTitle: "Electrical Engineering and Systems Science",
    group: "Electrical Engineering and Systems Science",
    description:
      "Theory, algorithms, and architectures for the formation, capture, processing, communication, analysis, and display of images, video, and multidimensional signals.",
  }),
  category({
    code: "eess.SP",
    title: "Signal Processing",
    badgeLabel: "Signal Processing",
    archiveCode: "eess",
    archiveTitle: "Electrical Engineering and Systems Science",
    group: "Electrical Engineering and Systems Science",
    description:
      "Signal and data analysis, detection, parameter estimation, learning, retrieval, communications signal processing, sensing, and optimization methods for signal processing applications.",
  }),
  category({
    code: "eess.SY",
    title: "Systems and Control",
    badgeLabel:
      "Systems and Control (Electrical Engineering and Systems Science)",
    archiveCode: "eess",
    archiveTitle: "Electrical Engineering and Systems Science",
    group: "Electrical Engineering and Systems Science",
    description:
      "Theoretical and experimental research on automatic control systems, including nonlinear, adaptive, stochastic, robust, distributed, hybrid, and cyber-physical control applications.",
  }),

  // Economics
  category({
    code: "econ.EM",
    title: "Econometrics",
    badgeLabel: "Econometrics",
    archiveCode: "econ",
    archiveTitle: "Economics",
    group: "Economics",
    description:
      "Econometric theory, micro-econometrics, macro-econometrics, empirical content of economic relations discovered through new methods, and methodological aspects of statistical inference for economic data.",
  }),
  category({
    code: "econ.GN",
    title: "General Economics",
    badgeLabel: "General Economics",
    archiveCode: "econ",
    archiveTitle: "Economics",
    group: "Economics",
    description:
      "General methodological, applied, and empirical contributions to economics.",
  }),
  category({
    code: "econ.TH",
    title: "Theoretical Economics",
    badgeLabel: "Theoretical Economics",
    archiveCode: "econ",
    archiveTitle: "Economics",
    group: "Economics",
    description:
      "Contract theory, decision theory, game theory, general equilibrium, growth, learning and evolution, macroeconomics, market and mechanism design, and social choice.",
  }),

  // Quantitative Finance
  category({
    code: "q-fin.CP",
    title: "Computational Finance",
    badgeLabel: "Computational Finance",
    archiveCode: "q-fin",
    archiveTitle: "Quantitative Finance",
    group: "Quantitative Finance",
    description:
      "Computational methods, including Monte Carlo, partial differential equations, lattice methods, and other numerical methods with applications to financial modeling.",
  }),
  category({
    code: "q-fin.EC",
    title: "Economics",
    badgeLabel: "Economics (Quantitative Finance)",
    archiveCode: "q-fin",
    archiveTitle: "Quantitative Finance",
    group: "Quantitative Finance",
    canonicalCode: "econ.GN",
    description:
      "Alias of econ.GN. Economics, including micro and macroeconomics, international economics, theory of the firm, labor economics, and other economic topics outside finance.",
  }),
  category({
    code: "q-fin.GN",
    title: "General Finance",
    badgeLabel: "General Finance",
    archiveCode: "q-fin",
    archiveTitle: "Quantitative Finance",
    group: "Quantitative Finance",
    description:
      "Development of general quantitative methodologies with applications in finance.",
  }),
  category({
    code: "q-fin.MF",
    title: "Mathematical Finance",
    badgeLabel: "Mathematical Finance",
    archiveCode: "q-fin",
    archiveTitle: "Quantitative Finance",
    group: "Quantitative Finance",
    description:
      "Mathematical and analytical methods of finance, including stochastic, probabilistic, functional, algebraic, and geometric methods.",
  }),
  category({
    code: "q-fin.PM",
    title: "Portfolio Management",
    badgeLabel: "Portfolio Management",
    archiveCode: "q-fin",
    archiveTitle: "Quantitative Finance",
    group: "Quantitative Finance",
    description:
      "Security selection and optimization, capital allocation, investment strategies, and performance measurement.",
  }),
  category({
    code: "q-fin.PR",
    title: "Pricing of Securities",
    badgeLabel: "Pricing of Securities",
    archiveCode: "q-fin",
    archiveTitle: "Quantitative Finance",
    group: "Quantitative Finance",
    description:
      "Valuation and hedging of financial securities, derivatives, and structured products.",
  }),
  category({
    code: "q-fin.RM",
    title: "Risk Management",
    badgeLabel: "Risk Management",
    archiveCode: "q-fin",
    archiveTitle: "Quantitative Finance",
    group: "Quantitative Finance",
    description:
      "Measurement and management of financial risks in trading, banking, insurance, corporate, and other applications.",
  }),
  category({
    code: "q-fin.ST",
    title: "Statistical Finance",
    badgeLabel: "Statistical Finance",
    archiveCode: "q-fin",
    archiveTitle: "Quantitative Finance",
    group: "Quantitative Finance",
    description:
      "Statistical, econometric, and econophysics analyses with applications to financial markets and economic data.",
  }),
  category({
    code: "q-fin.TR",
    title: "Trading and Market Microstructure",
    badgeLabel: "Trading and Market Microstructure",
    archiveCode: "q-fin",
    archiveTitle: "Quantitative Finance",
    group: "Quantitative Finance",
    description:
      "Market microstructure, liquidity, exchange and auction design, automated trading, agent-based modeling, and market-making.",
  }),
] as const satisfies readonly ArxivCategory[];

export const ARXIV_CATEGORY_BY_CODE: Record<string, ArxivCategory> =
  Object.freeze(
    Object.fromEntries(ARXIV_CATEGORIES.map((item) => [item.code, item])),
  );

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toRawTagString(input?: string | string[] | null) {
  if (!input) return "";
  return Array.isArray(input) ? input.join(" ") : input;
}

function getEffectiveCode(code: string) {
  const found = ARXIV_CATEGORY_BY_CODE[code];
  return found?.canonicalCode ?? code;
}

const KNOWN_ARXIV_CODES = Object.keys(ARXIV_CATEGORY_BY_CODE).sort(
  (a, b) => b.length - a.length,
);

const ARXIV_CODE_REGEX = new RegExp(
  KNOWN_ARXIV_CODES.map(escapeRegExp).join("|"),
  "g",
);

function makeUnknownCategory(code: string): ArxivCategory {
  const archiveCode = code.includes(".") ? code.split(".")[0] : code;

  return {
    code,
    title: code,
    badgeLabel: code,
    archiveCode,
    archiveTitle: "Unknown",
    group: "Unknown",
    description: "Unknown arXiv category.",
  };
}

export function getArxivCategory(code?: string | null) {
  if (!code) return null;
  return ARXIV_CATEGORY_BY_CODE[code.trim()] ?? null;
}

export function getCanonicalArxivCode(code?: string | null) {
  if (!code) return "";
  const found = getArxivCategory(code);
  return found?.canonicalCode ?? code.trim();
}

export function extractArxivCategoryCodes(input?: string | string[] | null) {
  const raw = toRawTagString(input)
    .replace(/Subjects?:/gi, " ")
    .replace(/[;,|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return [];

  const matches = raw.match(ARXIV_CODE_REGEX) ?? [];

  return Array.from(new Set(matches));
}

export function resolveArxivCategories(input?: string | string[] | null) {
  const codes = extractArxivCategoryCodes(input);
  const seen = new Set<string>();

  return codes.flatMap((code) => {
    const category = ARXIV_CATEGORY_BY_CODE[code] ?? makeUnknownCategory(code);
    const effectiveCode = getEffectiveCode(category.code);

    if (seen.has(effectiveCode)) {
      return [];
    }

    seen.add(effectiveCode);
    return [category];
  });
}

export function getArxivBadgeLabel(code?: string | null) {
  if (!code) return "";
  return getArxivCategory(code)?.badgeLabel ?? code;
}

export function getArxivCategoryTitle(code?: string | null) {
  if (!code) return "";
  return getArxivCategory(code)?.title ?? code;
}

export function getArxivCategoryDescription(code?: string | null) {
  if (!code) return "";
  return getArxivCategory(code)?.description ?? "";
}

export function hasKnownArxivCategory(code?: string | null) {
  if (!code) return false;
  return Boolean(getArxivCategory(code));
}
