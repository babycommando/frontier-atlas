import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Search } from "lucide-react";
import { DitheringShader } from "@/components/dithering-shader";
import { NasaApodCard } from "@/components/nasapod";

import { resolveArxivCategories } from "@/utils/arxiv-categories";
import { parseAbstract } from "@/utils/parseAbstract";
import { ResearchCardHome } from "@/components/ResearchCardHome";

type Paper = {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  tags: string[];
  primaryField: string | null;
  published: string | null;
  updated: string | null;
  absUrl: string | null;
  pdfUrl: string | null;
  affiliations?: string[];
  journalRef?: string | null;
  doi?: string | null;
};

type Topic = {
  slug: string;
  name: string;
  group: string;
  description: string;
  query: string;
  subtopics: string[];
  color: string;
};

type FetchPapersOptions = {
  mode?: "latest" | "live" | "search";
  sortBy?: "relevance" | "submittedDate" | "lastUpdatedDate";
  search?: string;
  excludeIds?: string[];
  pool?: number;
  seed?: string;
};

export const FIELD_COLORS: Record<string, string> = {
  "astro-ph": "#1a2d4a",
  "cond-mat": "#1a3320",
  "gr-qc": "#1a3340",
  "hep-ex": "#3d1a1a",
  "hep-lat": "#3d1a1a",
  "hep-ph": "#3d1a1a",
  "hep-th": "#3d1a1a",
  "math-ph": "#2d2d1a",
  nlin: "#2d1a1a",
  "nucl-ex": "#3d1a1a",
  "nucl-th": "#3d1a1a",
  "quant-ph": "#2d1a5c",
  math: "#2d2d1a",
  cs: "#0d2d3d",
  "q-bio": "#1a3d1a",
  stat: "#2d1a3d",
  eess: "#3d2d1a",
  econ: "#3d1a2d",
  "q-fin": "#1a2d1a",
  Unknown: "#2a2a2a",
};

export const TOPIC_COLORS: Record<string, string> = {
  mixed: "#1a1a2d",
  astrophysics: "#1a2d4a",
  quantum: "#2d1a5c",
  "high-energy": "#3d1a1a",
  "gravity-cosmology": "#1a3340",
  "condensed-matter": "#1a3320",
  mathematics: "#2d2d1a",
  "computer-science": "#0d2d3d",
  ai: "#0d2040",
  robotics: "#0d3020",
  biology: "#1a3d1a",
  statistics: "#2d1a3d",
  eess: "#3d2d1a",
  economics: "#3d1a2d",
  finance: "#1a2d1a",
  nonlinear: "#2d1a1a",
  "machine-learning": "#0a2a3a",
  "computer-vision": "#0d2d3a",
  nlp: "#1a1a3d",
  cryptography: "#2a1a1a",
  "systems-control": "#1a2a1a",
  genomics: "#1a3d25",
  neuroscience: "#1a2d3d",
};

export const TOPICS: Topic[] = [
  {
    slug: "mixed",
    name: "Frontier Mix",
    group: "Cross-field",
    description:
      "A broad pulse of current work across AI, physics, astronomy, maths, biology, systems, and economics.",
    query:
      "cat:cs.AI OR cat:cs.LG OR cat:stat.ML OR cat:astro-ph.CO OR cat:astro-ph.GA OR cat:quant-ph OR cat:hep-th OR cat:math.OC OR cat:math.PR OR cat:q-bio.QM OR cat:eess.SP OR cat:econ.EM",
    subtopics: [
      "Machine learning",
      "Astrophysics",
      "Quantum",
      "Optimisation",
      "Biology",
      "Systems",
    ],
    color: "#1a1a2d",
  },
  {
    slug: "astrophysics",
    name: "Astrophysics",
    group: "Physics",
    description:
      "Galaxies, cosmology, exoplanets, telescopes, stellar systems, and high-energy astrophysical phenomena.",
    query:
      "cat:astro-ph.CO OR cat:astro-ph.EP OR cat:astro-ph.GA OR cat:astro-ph.HE OR cat:astro-ph.IM OR cat:astro-ph.SR",
    subtopics: [
      "Cosmology",
      "Exoplanets",
      "Galaxies",
      "Black holes",
      "Instrumentation",
      "Stars",
      "Dark matter",
      "Dark energy",
      "Gravitational waves",
      "AGN",
      "Stellar evolution",
      "Solar physics",
    ],
    color: "#1a2d4a",
  },
  {
    slug: "quantum",
    name: "Quantum Physics",
    group: "Physics",
    description:
      "Quantum information, simulation, foundations, field theory, and mathematical structures around quantum systems.",
    query: "cat:quant-ph OR cat:hep-th OR cat:math-ph",
    subtopics: [
      "Quantum information",
      "Quantum simulation",
      "Foundations",
      "Field theory",
      "Optics",
      "Quantum algorithms",
      "Entanglement",
      "Quantum error correction",
      "Decoherence",
      "Quantum cryptography",
      "Quantum computing",
      "Bell inequalities",
    ],
    color: "#2d1a5c",
  },
  {
    slug: "high-energy",
    name: "High Energy",
    group: "Physics",
    description:
      "Theory, phenomenology, experiments, lattice methods, and nuclear work around fundamental particles and interactions.",
    query:
      "cat:hep-ex OR cat:hep-lat OR cat:hep-ph OR cat:hep-th OR cat:nucl-ex OR cat:nucl-th",
    subtopics: [
      "Phenomenology",
      "Experiments",
      "Lattice QCD",
      "QCD",
      "Beyond standard model",
      "Nuclear theory",
      "String theory",
      "Supersymmetry",
      "Higgs boson",
      "Dark matter candidates",
      "Neutrino physics",
      "Collider physics",
    ],
    color: "#3d1a1a",
  },
  {
    slug: "gravity-cosmology",
    name: "Gravity + Cosmology",
    group: "Physics",
    description:
      "General relativity, quantum cosmology, gravity, early universe models, and large-scale structure.",
    query: "cat:gr-qc OR cat:astro-ph.CO OR cat:hep-th",
    subtopics: [
      "General relativity",
      "Quantum gravity",
      "Inflation",
      "Dark matter",
      "Dark energy",
      "Gravitational waves",
      "Black holes",
      "Cosmological perturbations",
      "Large-scale structure",
      "CMB",
      "Loop quantum gravity",
      "Numerical relativity",
    ],
    color: "#1a3340",
  },
  {
    slug: "condensed-matter",
    name: "Condensed Matter",
    group: "Physics",
    description:
      "Materials, nanoscale systems, statistical mechanics, quantum gases, strongly correlated electrons, and superconductivity.",
    query:
      "cat:cond-mat.dis-nn OR cat:cond-mat.mes-hall OR cat:cond-mat.mtrl-sci OR cat:cond-mat.quant-gas OR cat:cond-mat.soft OR cat:cond-mat.stat-mech OR cat:cond-mat.str-el OR cat:cond-mat.supr-con",
    subtopics: [
      "Materials science",
      "Nanoscale physics",
      "Statistical mechanics",
      "Quantum gases",
      "Correlated electrons",
      "Superconductivity",
      "Topological phases",
      "Graphene",
      "Soft matter",
      "Spin liquids",
      "Phase transitions",
      "Quantum criticality",
    ],
    color: "#1a3320",
  },
  {
    slug: "mathematics",
    name: "Mathematics",
    group: "Mathematics",
    description:
      "A broad mathematical stream spanning optimisation, probability, geometry, analysis, combinatorics, and algebra.",
    query:
      "cat:math.AG OR cat:math.AP OR cat:math.CO OR cat:math.DG OR cat:math.NA OR cat:math.OC OR cat:math.PR OR cat:math.ST OR cat:math.QA",
    subtopics: [
      "Optimisation",
      "Probability",
      "Geometry",
      "Numerical analysis",
      "Combinatorics",
      "Algebra",
      "Algebraic geometry",
      "Analysis of PDEs",
      "Differential geometry",
      "Quantum algebra",
      "Statistics theory",
      "Graph theory",
    ],
    color: "#2d2d1a",
  },
  {
    slug: "computer-science",
    name: "Computer Science",
    group: "Computer Science",
    description:
      "A wide computer science feed including AI, systems, security, databases, software engineering, retrieval, and robotics.",
    query:
      "cat:cs.AI OR cat:cs.CL OR cat:cs.CR OR cat:cs.CV OR cat:cs.DB OR cat:cs.DC OR cat:cs.IR OR cat:cs.LG OR cat:cs.RO OR cat:cs.SE",
    subtopics: [
      "Artificial intelligence",
      "Machine learning",
      "Systems",
      "Security",
      "Databases",
      "Retrieval",
      "Robotics",
      "Computer vision",
      "NLP",
      "Software engineering",
      "Distributed computing",
      "Algorithms",
    ],
    color: "#0d2d3d",
  },
  {
    slug: "ai",
    name: "AI & Machine Learning",
    group: "Computer Science",
    description:
      "Artificial intelligence across machine learning, language, vision, robotics, retrieval, and statistical learning.",
    query:
      "cat:cs.AI OR cat:cs.LG OR cat:stat.ML OR cat:cs.CL OR cat:cs.CV OR cat:cs.RO OR cat:cs.IR",
    subtopics: [
      "Large language models",
      "Reasoning",
      "Computer vision",
      "Robotics",
      "Retrieval",
      "Representation learning",
      "Reinforcement learning",
      "Generative models",
      "Transformers",
      "Few-shot learning",
      "Multimodal",
      "Alignment",
    ],
    color: "#0d2040",
  },
  {
    slug: "robotics",
    name: "Robotics",
    group: "Computer Science",
    description:
      "Robot perception, planning, control, manipulation, and autonomous systems.",
    query: "cat:cs.RO OR cat:cs.AI OR cat:eess.SY OR cat:cs.LG",
    subtopics: [
      "Motion planning",
      "Manipulation",
      "Perception",
      "Control",
      "Autonomous vehicles",
      "Human-robot interaction",
      "Sim-to-real",
      "Legged robots",
      "Drone navigation",
      "SLAM",
      "Reinforcement learning for robots",
      "Robot learning",
    ],
    color: "#0d3020",
  },
  {
    slug: "nlp",
    name: "NLP",
    group: "Computer Science",
    description:
      "Natural language processing, computational linguistics, language models, and text understanding.",
    query: "cat:cs.CL OR cat:cs.AI OR cat:cs.LG",
    subtopics: [
      "Language models",
      "Machine translation",
      "Question answering",
      "Summarisation",
      "Sentiment analysis",
      "Named entity recognition",
      "Dialogue systems",
      "Text generation",
      "Embeddings",
      "Parsing",
      "Speech",
      "Multilingual NLP",
    ],
    color: "#1a1a3d",
  },
  {
    slug: "computer-vision",
    name: "Computer Vision",
    group: "Computer Science",
    description:
      "Image understanding, object detection, segmentation, 3D vision, and visual representation learning.",
    query: "cat:cs.CV OR cat:cs.LG OR cat:eess.IV",
    subtopics: [
      "Object detection",
      "Segmentation",
      "Image generation",
      "3D reconstruction",
      "Video understanding",
      "Scene understanding",
      "Medical imaging",
      "Self-supervised vision",
      "Depth estimation",
      "Optical flow",
      "Face recognition",
      "Diffusion models",
    ],
    color: "#0d2d3a",
  },
  {
    slug: "biology",
    name: "Quantitative Biology",
    group: "Quantitative Biology",
    description:
      "Genomics, biomolecules, neurons, evolution, quantitative methods, tissues, and biological systems modelling.",
    query:
      "cat:q-bio.BM OR cat:q-bio.CB OR cat:q-bio.GN OR cat:q-bio.MN OR cat:q-bio.NC OR cat:q-bio.PE OR cat:q-bio.QM OR cat:q-bio.SC OR cat:q-bio.TO",
    subtopics: [
      "Genomics",
      "Neurons and cognition",
      "Evolution",
      "Tumor growth",
      "Molecular networks",
      "Biomolecules",
      "Cell behaviour",
      "Protein folding",
      "Populations",
      "Subcellular processes",
      "Tissues and organs",
      "Epidemiology",
    ],
    color: "#1a3d1a",
  },
  {
    slug: "genomics",
    name: "Genomics",
    group: "Quantitative Biology",
    description:
      "DNA sequencing, gene finding, genomic structure, and computational genomics.",
    query: "cat:q-bio.GN OR cat:q-bio.BM OR cat:q-bio.MN",
    subtopics: [
      "DNA sequencing",
      "Gene expression",
      "CRISPR",
      "Epigenetics",
      "Transcriptomics",
      "Proteomics",
      "Variant calling",
      "Genome assembly",
      "Single-cell",
      "Metagenomics",
      "Regulatory networks",
      "RNA splicing",
    ],
    color: "#1a3d25",
  },
  {
    slug: "neuroscience",
    name: "Computational Neuroscience",
    group: "Quantitative Biology",
    description:
      "Neural coding, brain dynamics, cognition, sensorimotor control, and neural network models of the brain.",
    query: "cat:q-bio.NC OR cat:q-bio.QM OR cat:cs.NE",
    subtopics: [
      "Neural coding",
      "Brain dynamics",
      "Cognition",
      "Sensorimotor",
      "Connectomics",
      "Spiking networks",
      "Memory",
      "Decision making",
      "Visual cortex",
      "Oscillations",
      "Plasticity",
      "Whole-brain models",
    ],
    color: "#1a2d3d",
  },
  {
    slug: "statistics",
    name: "Statistics",
    group: "Statistics",
    description:
      "Applications, methodology, theory, computation, and statistical machine learning.",
    query:
      "cat:stat.AP OR cat:stat.CO OR cat:stat.ME OR cat:stat.ML OR cat:stat.OT OR cat:stat.TH",
    subtopics: [
      "Bayesian inference",
      "Computation",
      "Methodology",
      "Asymptotic theory",
      "Time series",
      "Statistical ML",
      "Causal inference",
      "Multiple testing",
      "Nonparametric methods",
      "Survival analysis",
      "High-dimensional statistics",
      "Experimental design",
    ],
    color: "#2d1a3d",
  },
  {
    slug: "eess",
    name: "Electrical Engineering + Systems",
    group: "EESS",
    description:
      "Signal processing, audio, systems and control, and image and video processing.",
    query: "cat:eess.AS OR cat:eess.IV OR cat:eess.SP OR cat:eess.SY",
    subtopics: [
      "Signal processing",
      "Audio and speech",
      "Control theory",
      "Image processing",
      "Video processing",
      "Systems",
      "Compressed sensing",
      "Adaptive filtering",
      "Power systems",
      "Communications",
      "Radar",
      "Biomedical signals",
    ],
    color: "#3d2d1a",
  },
  {
    slug: "economics",
    name: "Economics",
    group: "Economics",
    description:
      "Econometrics, general economics, and theoretical economics with a quantitative slant.",
    query: "cat:econ.EM OR cat:econ.GN OR cat:econ.TH",
    subtopics: [
      "Econometrics",
      "Macroeconomics",
      "Microeconomics",
      "Growth",
      "Markets",
      "Game theory",
      "Labour economics",
      "Industrial organisation",
      "International trade",
      "Mechanism design",
      "Behavioural economics",
      "Social choice",
    ],
    color: "#3d1a2d",
  },
  {
    slug: "finance",
    name: "Quantitative Finance",
    group: "Quantitative Finance",
    description:
      "Pricing, portfolio management, risk, trading, market microstructure, and statistical finance.",
    query:
      "cat:q-fin.CP OR cat:q-fin.EC OR cat:q-fin.GN OR cat:q-fin.MF OR cat:q-fin.PM OR cat:q-fin.PR OR cat:q-fin.RM OR cat:q-fin.ST OR cat:q-fin.TR",
    subtopics: [
      "Pricing",
      "Risk management",
      "Portfolio",
      "Trading",
      "Market microstructure",
      "Econometrics",
      "Mathematical finance",
      "Stochastic calculus",
      "Derivatives",
      "Algorithmic trading",
      "Crypto markets",
      "Factor models",
    ],
    color: "#1a2d1a",
  },
  {
    slug: "nonlinear",
    name: "Nonlinear Sciences",
    group: "Physics",
    description:
      "Chaotic dynamics, complex systems, cellular automata, integrable systems, and pattern formation.",
    query:
      "cat:nlin.AO OR cat:nlin.CD OR cat:nlin.CG OR cat:nlin.PS OR cat:nlin.SI",
    subtopics: [
      "Chaos",
      "Complex systems",
      "Cellular automata",
      "Integrable systems",
      "Solitons",
      "Self-organisation",
      "Pattern formation",
      "Network science",
      "Turbulence",
      "Synchronisation",
      "Reaction-diffusion",
      "Adaptive systems",
    ],
    color: "#2d1a1a",
  },
  {
    slug: "cryptography",
    name: "Cryptography & Security",
    group: "Computer Science",
    description:
      "Cryptographic protocols, security, privacy, and formal verification of secure systems.",
    query: "cat:cs.CR OR cat:cs.IT OR cat:quant-ph",
    subtopics: [
      "Public-key cryptography",
      "Zero-knowledge proofs",
      "Secure computation",
      "Post-quantum cryptography",
      "Blockchain",
      "Privacy",
      "Formal verification",
      "Side-channel attacks",
      "Network security",
      "Authentication",
      "Homomorphic encryption",
      "Key exchange",
    ],
    color: "#2a1a1a",
  },
  {
    slug: "systems-control",
    name: "Systems & Control",
    group: "EESS",
    description:
      "Control theory, dynamical systems, optimisation in control, and cyber-physical systems.",
    query: "cat:eess.SY OR cat:cs.SY OR cat:math.OC",
    subtopics: [
      "Optimal control",
      "Model predictive control",
      "Stability",
      "Nonlinear control",
      "Adaptive control",
      "Stochastic control",
      "Cyber-physical systems",
      "Robust control",
      "Distributed control",
      "Reinforcement learning control",
      "Hybrid systems",
      "Multi-agent systems",
    ],
    color: "#1a2a1a",
  },
];

export const TOPIC_BY_SLUG = Object.fromEntries(
  TOPICS.map((topic) => [topic.slug, topic]),
) as Record<string, Topic>;

export const TOPICS_A_TO_Z = [...TOPICS].sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
);

export function getBadgeStyle(archiveCode: string): React.CSSProperties {
  const color = FIELD_COLORS[archiveCode] ?? FIELD_COLORS["Unknown"];
  return {
    backgroundColor: color,
    color: "#e8e8e8",
    border: `1px solid ${color}dd`,
  };
}

function unique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function buildSeenKey(slug: string) {
  return `frontier-atlas:seen:${slug}`;
}

function readSeenIds(slug: string) {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(buildSeenKey(slug));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return unique(parsed.map(String)).slice(-240);
  } catch {
    return [];
  }
}

function writeSeenIds(slug: string, papers: Paper[]) {
  if (typeof window === "undefined" || papers.length === 0) return;

  const current = readSeenIds(slug);
  const next = unique([...current, ...papers.map((paper) => paper.id)]).slice(
    -240,
  );

  window.localStorage.setItem(buildSeenKey(slug), JSON.stringify(next));
}

async function fetchPapers(
  query: string,
  limit = 12,
  options: FetchPapersOptions = {},
): Promise<Paper[]> {
  const params = new URLSearchParams();

  params.set("query", query);
  params.set("limit", String(limit));

  if (options.mode) {
    params.set("mode", options.mode);
  }

  if (options.sortBy) {
    params.set("sortBy", options.sortBy);
  }

  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }

  if (options.excludeIds?.length) {
    params.set("excludeIds", options.excludeIds.slice(-120).join(","));
  }

  if (options.pool) {
    params.set("pool", String(options.pool));
  }

  if (options.seed) {
    params.set("seed", options.seed);
  }

  const response = await fetch(`/api/arxiv?${params.toString()}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || data?.error || "Failed to load papers");
  }

  return data?.papers || [];
}

export default function HomePage() {
  const activeSlug = "mixed";

  const [searchInput, setSearchInput] = useState("");
  const [frontierPapers, setFrontierPapers] = useState<Paper[]>([]);
  const [frontierLoading, setFrontierLoading] = useState(true);
  const [frontierError, setFrontierError] = useState("");
  const requestIdRef = useRef(0);

  async function loadFrontier(slug: string, rawTerm = "") {
    const requestId = ++requestIdRef.current;
    const term = rawTerm.trim();

    try {
      setFrontierLoading(true);
      setFrontierError("");

      const topic = TOPIC_BY_SLUG[slug];
      const excludeIds = term ? [] : readSeenIds(slug).slice(-120);

      const seed = term
        ? `${slug}:search:${term.toLowerCase()}`
        : `${slug}:live:${Date.now()}:${Math.random().toString(36).slice(2)}:${excludeIds.length}`;

      const papers = await fetchPapers(topic.query, 12, {
        mode: term ? "search" : "live",
        sortBy: term ? "relevance" : undefined,
        search: term || undefined,
        excludeIds,
        pool: term ? 48 : 96,
        seed,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setFrontierPapers(papers);

      if (!term) {
        writeSeenIds(slug, papers);
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setFrontierPapers([]);
      setFrontierError(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setFrontierLoading(false);
      }
    }
  }

  useEffect(() => {
    setSearchInput("");
    void loadFrontier(activeSlug, "");
  }, [activeSlug]);

  return (
    <>
      <Head>
        <title>Frontier Atlas</title>
        <meta
          name="description"
          content="Real time scientific research in your fingertips."
        />
      </Head>

      <main className="min-h-screen bg-background">
        <div className="mx-auto px-6 py-6">
          <header className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex flex-wrap items-center content-center gap-2">
                      <h1 className="mb-1 text-lg leading-none font-semibold text-white tracking-tighter whitespace-pre-wrap ">
                        Frontier Atlas
                      </h1>
                      <p className="text-xs text-muted-foreground">beta 0.1</p>
                    </div>
                    <p className="text-xs  text-muted-foreground">
                      The latest scientific research papers at your fingertips.
                    </p>
                    <p className="text-xs  text-muted-foreground">
                      An instrument to browse bleeding edge human knowledge with
                      ease.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <Link className="hover:underline" href={"/about"}>
                  <p>How does it work</p>
                </Link>
                <Link className="hover:underline" href={"/about"}>
                  <p>About</p>
                </Link>
              </div>
            </div>

            <div className="relative w-full overflow-hidden">
              <DitheringShader
                height={280}
                shape="swirl"
                type="random"
                colorBack="#000000"
                colorFront="#652121"
                pxSize={4}
                speed={0.9}
              />

              <span className="pointer-events-none absolute inset-0 z-10 flex gap-3 items-center justify-center text-center text-2xl leading-none font-semibold text-white tracking-tighter whitespace-pre-wrap">
                Frontier Atlas
                <p className="text-xs  ">
                  Explore the edge human of knowledge with ease.
                </p>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {TOPICS_A_TO_Z.map((topic) => (
                <Button
                  key={topic.slug}
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  style={{
                    borderColor: `${topic.color}99`,
                    backgroundColor: `${topic.color}33`,
                    color: "#e8e8e8",
                  }}>
                  <Link href={`/topic/${topic.slug}`}>{topic.name}</Link>
                </Button>
              ))}
            </div>
          </header>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.55fr_0.55fr]">
            <Card className=" border-border/60 bg-card/95">
              <CardHeader className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <CardDescription className="max-w-2xl text-sm font-medium leading-7 ">
                      Arxiv Mixed Feed
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {frontierError ? (
                  <Card className="border-destructive/40">
                    <CardContent className="pt-6 text-sm text-destructive">
                      {frontierError}
                    </CardContent>
                  </Card>
                ) : null}

                <div className="grid gap-4 md:grid-cols-1">
                  {frontierLoading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="">
                          <div className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                          <div className="flex flex-wrap gap-2 space-y-3 mt-2 mb-2">
                            <Skeleton className="h-5 w-24 rounded-full" />
                            <Skeleton className="h-5 w-24 rounded-full" />
                          </div>
                        </div>
                      ))
                    : frontierPapers.map((paper) => {
                        const categories = resolveArxivCategories(paper.tags);

                        const primaryArchiveCode =
                          categories[0]?.archiveCode ?? null;
                        const topicSlugForPaper =
                          TOPICS.find((t) => {
                            if (!primaryArchiveCode) return false;
                            return t.query.includes(
                              `cat:${primaryArchiveCode}`,
                            );
                          })?.slug ?? null;

                        return (
                          <div
                            key={paper.id}
                            className="rounded-3xl border-border/60 bg-card/70">
                            <Link
                              href={`/paper/${encodeURIComponent(paper.id)}`}
                              className="block">
                              <h2 className="text-xl font-semibold hover:underline">
                                {parseAbstract(paper.title)}
                              </h2>
                            </Link>

                            <div className="space-y-3 mb-3">
                              <div className="space-y-3">
                                <p className="text-sm font-medium tracking-tighter text-muted-foreground line-clamp-3">
                                  {parseAbstract(paper.abstract)}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2 justify-between">
                                <div className="flex flex-wrap gap-2">
                                  {primaryArchiveCode && (
                                    <Link
                                      href={
                                        topicSlugForPaper
                                          ? `/topic/${topicSlugForPaper}`
                                          : "#"
                                      }>
                                      <Badge
                                        variant="secondary"
                                        className="rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                                        style={getBadgeStyle(
                                          primaryArchiveCode,
                                        )}>
                                        {categories[0]?.archiveTitle ??
                                          primaryArchiveCode}
                                      </Badge>
                                    </Link>
                                  )}

                                  {categories.slice(0, 3).map((category) => {
                                    const subTopicSlug =
                                      TOPICS.find((t) =>
                                        t.query.includes(
                                          `cat:${category.code}`,
                                        ),
                                      )?.slug ?? null;
                                    return (
                                      <Link
                                        key={`${paper.id}-${category.code}`}
                                        href={
                                          subTopicSlug
                                            ? `/topic/${subTopicSlug}`
                                            : "#"
                                        }>
                                        <Badge
                                          variant="secondary"
                                          className="rounded-full cursor-pointer hover:opacity-80 transition-opacity text-xs"
                                          style={getBadgeStyle(
                                            category.archiveCode,
                                          )}
                                          title={category.description}>
                                          {category.badgeLabel}
                                        </Badge>
                                      </Link>
                                    );
                                  })}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  {paper.absUrl ? (
                                    <a
                                      href={paper.absUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-medium text-foreground underline underline-offset-4">
                                      Abstract
                                    </a>
                                  ) : null}
                                  {paper.pdfUrl ? (
                                    <a
                                      href={paper.pdfUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-medium text-foreground underline underline-offset-4">
                                      PDF
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void loadFrontier(activeSlug, searchInput);
                }}>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={`Find Papers`}
                    className="pl-9"
                  />
                </div>

                <Button type="submit" variant="outline">
                  Search
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchInput("");
                    void loadFrontier(activeSlug, "");
                  }}>
                  Refresh
                </Button>
              </form>

              <ResearchCardHome />

              <Card className="border-border/60 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Trending Areas of Knowledge
                  </CardTitle>
                  <CardDescription>
                    Jump into a topic page when you want a more focused stream.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2">
                  {TOPICS.filter((topic) => topic.slug !== activeSlug)
                    .slice(0, 6)
                    .map((topic) => (
                      <Button
                        key={topic.slug}
                        asChild
                        variant="ghost"
                        className="h-auto w-full justify-between rounded-2xl px-4 py-3">
                        <Link href={`/topic/${topic.slug}`}>
                          <span className="text-left flex items-center gap-3">
                            <span
                              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: topic.color }}
                            />
                            <span>
                              <span className="block font-medium text-foreground">
                                {topic.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {topic.group}
                              </span>
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ))}
                </CardContent>
              </Card>

              <NasaApodCard />
            </div>
          </section>

          <section className="mt-10 space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                Multiple fields moving at once
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                A homepage should already feel useful. These preview streams
                make Frontier Atlas feel like a living instrument, not a static
                page.
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
