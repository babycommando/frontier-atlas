import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { Space_Grotesk } from "next/font/google";
import "@/styles/globals.css";

const inter = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={`${inter.variable} font-sans`}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange>
        <Component {...pageProps} />
      </ThemeProvider>
    </main>
  );
}
