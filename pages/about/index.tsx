import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { YouTubeEmbed } from "@next/third-parties/google";

import { DitheringShader } from "@/components/dithering-shader";

export default function HomePage() {
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
              <h1 className="text-8xl font-black">Dear scientist,</h1>
              <h1 className="text-7xl font-black">
                the world needs you badly.
              </h1>

              <div className="text-xl mt-6">
                <p className=" tracking-tight ">
                  A monumental amount of scientific research papers from the
                  most diverse areas of human knowledge are released every
                  minute. The Frontier Atlas is your instrument, designed to
                  help you navigate information with ease, accessibility and
                  inspiration.
                </p>
                <br />

                <p className=" tracking-tight ">
                  And therefore I make professor Edward Osborne Wilson's words
                  my own:
                </p>
              </div>

              <div className="aspect-video w-full [&>lite-youtube]:max-w-full">
                <YouTubeEmbed
                  videoid="IzPcu0-ETTU"
                  params="start=44&cc_load_policy=1&cc_lang_pref=en"
                />
              </div>

              <br />
              <div className="text-xl">
                <p className=" tracking-tight ">
                  " So let me begin by urging you, particularly you on the
                  youngsters' side, on this path you've chosen, to go as far as
                  you can. The world needs you, badly. Humanity is now fully
                  into the techno-scientific age. There is going to be no
                  turning back. Although varying among disciplines, say,
                  astrophysics, molecular genetics, the immunology, the
                  microbiology, the public health, to the new area of the human
                  body as a symbiont, to public health, environmental science.
                  [...] Traditional fields of study are going to continue to
                  grow and in so doing, inevitably they will meet and create new
                  disciplines. In time, all of science will come to be a
                  continuum of description, an explanation of networks, of
                  principles and laws. That's why you need not just be training
                  in one specialty, but also acquire breadth in other fields,
                  related to and even distant from your own initial choice.{" "}
                </p>
                <br />

                <p className=" tracking-tighter ">
                  Keep your eyes lifted and your head turning. The search for
                  knowledge is in our genes. It was put there by our distant
                  ancestors who spread across the world, and it's never going to
                  be quenched."
                </p>
              </div>
              <div className="text-xl mt-6">
                <p className=" tracking-tight ">
                  - Professor Edward Osborne Wilson (1929, 2021)
                </p>
              </div>
              <br />
              <h1 className="text-4xl font-black">Go as far as you can.</h1>
            </div>
          </header>
        </div>
      </main>
    </>
  );
}
