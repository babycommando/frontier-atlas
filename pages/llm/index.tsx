import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { YouTubeEmbed } from "@next/third-parties/google";

import { DitheringShader } from "@/components/dithering-shader";

import { pipeline } from "@huggingface/transformers";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    const generator = await pipeline(
      "text-generation",
      "onnx-community/Qwen3-0.6B-Instruct-ONNX",
    );

    const output = await generator(prompt, { max_new_tokens: 50 });
    setText(output[0].generated_text);
  }

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
            {/* <div className="relative w-full h-6 overflow-hidden">
              <span className="pointer-events-none absolute inset-0 z-10 flex gap-3 items-center  text-center text-2xl leading-none font-semibold text-white tracking-tighter whitespace-pre-wrap">
                Frontier Atlas
                <p className="text-xs  ">
                  An instrument to browse the latest scientific papers with
                  ease.
                </p>
              </span>
            </div> */}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div>
                    <Link href={"/"}>
                      <h1 className="mb-1 text-lg leading-none font-semibold text-white tracking-tighter whitespace-pre-wrap ">
                        Frontier Atlas
                      </h1>
                    </Link>
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
                  An instrument to browse bleeding edge human knowledge with
                  ease.
                </p>
              </span>
            </div>

            <div className="px-50">
              <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-6">
                <div className="w-full max-w-xl space-y-4">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Type your prompt..."
                    className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />

                  <button
                    onClick={generate}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-lime-400 text-black font-medium hover:bg-lime-300 transition disabled:opacity-50">
                    {loading ? "Thinking..." : "Run"}
                  </button>

                  <p className="text-neutral-200 text-sm leading-relaxed bg-neutral-900 border border-neutral-800 rounded-xl p-4 min-h-[80px]">
                    {text || "Your result will appear here."}
                  </p>
                </div>
              </div>
            </div>
          </header>
        </div>
      </main>
    </>
  );
}
