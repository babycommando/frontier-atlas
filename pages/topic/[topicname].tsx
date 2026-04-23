import Head from "next/head";
import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
} from "next";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

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
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { DitheringShader } from "@/components/dithering-shader";
import { resolveArxivCategories } from "@/utils/arxiv-categories";

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

const FIELD_COLORS: Record<string, string> = {
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

function getBadgeStyle(archiveCode: string): CSSProperties {
  const color = FIELD_COLORS[archiveCode] ?? FIELD_COLORS["Unknown"];
  return {
    backgroundColor: color,
    color: "#e8e8e8",
    border: `1px solid ${color}dd`,
  };
}

const TOPICS: Topic[] = [
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
      "Economics",
      "Signal processing",
      "Mathematics",
      "Statistics",
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

const TOPIC_BY_SLUG = Object.fromEntries(
  TOPICS.map((topic) => [topic.slug, topic]),
) as Record<string, Topic>;

const TOPICS_A_TO_Z = [...TOPICS].sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
);

function unique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildScopedQuery(baseQuery: string, term: string) {
  const cleanTerm = term.trim().replace(/"/g, "");
  if (!cleanTerm) return baseQuery;
  return `(${baseQuery}) AND all:"${cleanTerm}"`;
}

async function fetchPapers(query: string, limit = 18): Promise<Paper[]> {
  const response = await fetch(
    `/api/arxiv?query=${encodeURIComponent(query)}&limit=${limit}`,
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Failed to load papers");
  }

  return data?.papers || [];
}

function PaperCard({ paper }: { paper: Paper }) {
  const affiliations = unique(paper.affiliations || []).slice(0, 2);
  const categories = resolveArxivCategories(paper.tags);
  const primaryArchiveCode = categories[0]?.archiveCode ?? null;

  return (
    <Card className="rounded-3xl border-border/60 bg-card/95 transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {primaryArchiveCode && (
            <Badge
              className="rounded-full"
              style={getBadgeStyle(primaryArchiveCode)}>
              {categories[0]?.archiveTitle ?? primaryArchiveCode}
            </Badge>
          )}

          {categories.slice(0, 2).map((category) => (
            <Badge
              key={category.code}
              className="rounded-full text-xs"
              style={getBadgeStyle(category.archiveCode)}
              title={category.description}>
              {category.badgeLabel}
            </Badge>
          ))}
        </div>

        <div className="space-y-2">
          <CardTitle className="text-lg leading-snug text-balance">
            {paper.title}
          </CardTitle>
          <CardDescription className="line-clamp-1">
            {paper.authors.join(", ")}
          </CardDescription>
          {affiliations.length ? (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{affiliations.join(" • ")}</span>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
          {paper.abstract}
        </p>

        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>{formatDate(paper.published)}</span>

          <div className="flex items-center gap-3">
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
      </CardContent>
    </Card>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: TOPICS.map((topic) => ({
      params: { topicname: topic.slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<{
  topic: Topic;
}> = async ({ params }) => {
  const topicname = String(params?.topicname || "");
  const topic = TOPIC_BY_SLUG[topicname];

  if (!topic) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      topic,
    },
  };
};

export default function TopicPage({
  topic,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const [search, setSearch] = useState("");
  const [activeTerm, setActiveTerm] = useState("");
  const [limit, setLimit] = useState(18);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authorsInView = useMemo(
    () => unique(papers.flatMap((paper) => paper.authors)).slice(0, 12),
    [papers],
  );

  const institutionsInView = useMemo(
    () =>
      unique(papers.flatMap((paper) => paper.affiliations || [])).slice(0, 10),
    [papers],
  );

  async function load(term: string, nextLimit: number) {
    try {
      setLoading(true);
      setError("");

      const papers = await fetchPapers(
        buildScopedQuery(topic.query, term),
        nextLimit,
      );

      setPapers(papers);
    } catch (error) {
      setPapers([]);
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSearch("");
    setActiveTerm("");
    setLimit(18);
  }, [topic.slug]);

  useEffect(() => {
    void load(activeTerm, limit);
  }, [topic.query, activeTerm, limit]);

  return (
    <>
      <Head>
        <title>Frontier Atlas | {topic.name}</title>
        <meta name="description" content={topic.description} />
      </Head>

      <main className="min-h-screen bg-background">
        <div className="mx-auto px-6 py-6">
          <header className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-white mb-1">
                        <ArrowLeft className="h-4 w-4 shrink-0" />
                        <h1 className="text-lg leading-none font-semibold tracking-tighter whitespace-pre-wrap">
                          Back to Frontier Atlas
                        </h1>
                      </Link>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      The latest scientific research papers at your fingertips.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      An instrument to browse bleeding edge human knowledge with
                      ease.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative w-full overflow-hidden">
              <DitheringShader
                height={280}
                shape="swirl"
                type="random"
                colorBack="#000000"
                colorFront={topic.color}
                pxSize={4}
                speed={0.9}
              />

              <span className="pointer-events-none absolute inset-0 z-10 flex gap-3 items-center justify-center text-center text-2xl leading-none font-semibold text-white tracking-tighter whitespace-pre-wrap">
                {topic.name}
                <p className="text-xs">{topic.description}</p>
              </span>
            </div>
          </header>

          <header className="space-y-6 mt-6">
            <div className="flex flex-wrap gap-2">
              {TOPICS_A_TO_Z.map((item) => (
                <Button
                  key={item.slug}
                  asChild
                  size="sm"
                  className="rounded-full"
                  style={
                    item.slug === topic.slug
                      ? {
                          backgroundColor: item.color,
                          color: "#ffffff",
                          border: `1px solid ${item.color}`,
                        }
                      : {
                          backgroundColor: `${item.color}33`,
                          color: "#e8e8e8",
                          border: `1px solid ${item.color}99`,
                        }
                  }>
                  <Link href={`/topic/${item.slug}`}>{item.name}</Link>
                </Button>
              ))}
            </div>
          </header>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
            <Card className="bg-card/95">
              <CardHeader className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    {/* <Sparkles className="h-3.5 w-3.5" /> */}
                    Topic stream
                  </div>
                  <CardTitle className="text-3xl">
                    The {topic.name} Frontier
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-sm leading-7">
                    Scan the latest work in {topic.name}, narrow the stream with
                    a query, and open the papers that matter without losing
                    context.
                  </CardDescription>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setLimit(18);
                    setActiveTerm(search.trim());
                  }}
                  className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={`Search inside ${topic.name}`}
                      className="h-11 rounded-full pl-9"
                    />
                  </div>

                  <Button type="submit" className="h-11 rounded-full px-6">
                    Search
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full px-6"
                    onClick={() => {
                      setSearch("");
                      setLimit(18);
                      setActiveTerm("");
                    }}>
                    Reset
                  </Button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {topic.subtopics.map((subtopic) => (
                    <Button
                      key={subtopic}
                      type="button"
                      size="sm"
                      className="rounded-full"
                      style={
                        activeTerm === subtopic
                          ? {
                              backgroundColor: topic.color,
                              color: "#ffffff",
                              border: `1px solid ${topic.color}`,
                            }
                          : {
                              backgroundColor: `${topic.color}22`,
                              color: "#e8e8e8",
                              border: `1px solid ${topic.color}66`,
                            }
                      }
                      onClick={() => {
                        setSearch(subtopic);
                        setLimit(18);
                        setActiveTerm(subtopic);
                      }}>
                      {subtopic}
                    </Button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {error ? (
                  <Card className="border-destructive/40">
                    <CardContent className="pt-6 text-sm text-destructive">
                      {error}
                    </CardContent>
                  </Card>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="rounded-full border border-border/60 px-3 py-1">
                    {papers.length} papers in view
                  </span>
                  <span className="rounded-full border border-border/60 px-3 py-1">
                    {activeTerm ? `Scoped to "${activeTerm}"` : "Latest stream"}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {loading
                    ? Array.from({ length: 8 }).map((_, index) => (
                        <Card
                          key={index}
                          className="rounded-3xl border-border/60">
                          <CardHeader className="space-y-3">
                            <Skeleton className="h-5 w-24 rounded-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-4/5" />
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </CardContent>
                        </Card>
                      ))
                    : papers.map((paper) => (
                        <PaperCard key={paper.id} paper={paper} />
                      ))}
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setLimit((current) => current + 12)}>
                    Load more
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-card/95">
                <CardHeader className="space-y-3">
                  <CardTitle className="text-2xl">Board</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Subtopics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {topic.subtopics.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setSearch(item);
                            setLimit(18);
                            setActiveTerm(item);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="cursor-pointer hover:opacity-80 transition-opacity">
                          <Badge
                            className="rounded-full"
                            style={{
                              backgroundColor: `${topic.color}44`,
                              color: "#e0e0e0",
                              border: `1px solid ${topic.color}88`,
                            }}>
                            {item}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      Authors in view
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {authorsInView.length ? (
                        authorsInView.map((author) => (
                          <Badge key={author} variant="secondary">
                            {author}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Loading authors from the current stream.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      Institutions in view
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {institutionsInView.length ? (
                        institutionsInView.map((institution) => (
                          <Badge key={institution} variant="secondary">
                            {institution}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Affiliation metadata will appear here when available.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/95">
                <CardHeader>
                  <CardTitle className="text-xl">Related routes</CardTitle>
                  <CardDescription>
                    Keep moving through adjacent fields without leaving the app.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2">
                  {TOPICS_A_TO_Z.filter((item) => item.slug !== topic.slug)
                    .slice(0, 6)
                    .map((item) => (
                      <Button
                        key={item.slug}
                        asChild
                        variant="ghost"
                        className="h-auto w-full justify-between rounded-2xl px-4 py-3">
                        <Link href={`/topic/${item.slug}`}>
                          <span className="text-left flex items-center gap-3">
                            <span
                              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>
                              <span className="block font-medium text-foreground">
                                {item.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {item.group}
                              </span>
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ))}
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
