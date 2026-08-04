"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4";

// Fade in after `delay` ms over `duration` ms.
function FadeIn({
  children,
  delay,
  duration = 1000,
  className = "",
}: {
  children: React.ReactNode;
  delay: number;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const h = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(h);
  }, [delay]);
  return (
    <div
      className={`transition-opacity ${className}`}
      style={{ opacity: shown ? 1 : 0, transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

// Character-by-character entrance. Each char translates in from the left.
function AnimatedHeading({
  text,
  className = "",
  style,
  initialDelay = 200,
  charDelay = 30,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  initialDelay?: number;
  charDelay?: number;
}) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const h = setTimeout(() => setGo(true), initialDelay);
    return () => clearTimeout(h);
  }, [initialDelay]);

  const lines = text.split("\n");
  return (
    <h1 className={className} style={style}>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} className="block">
          {line.split("").map((char, charIndex) => {
            const delay = lineIndex * line.length * charDelay + charIndex * charDelay;
            return (
              <span
                key={charIndex}
                className="inline-block"
                style={{
                  opacity: go ? 1 : 0,
                  transform: go ? "translateX(0)" : "translateX(-18px)",
                  transition: "opacity 500ms, transform 500ms",
                  transitionDelay: `${delay}ms`,
                }}
              >
                {char === " " ? " " : char}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

const NAV_LINKS = ["Story", "Investing", "Building", "Advisory"];

export default function Hero() {
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden text-white">
      {/* Background video — raw, no overlay */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Foreground */}
      <div className="relative z-10 flex h-full flex-col px-6 pt-6 md:px-12 lg:px-16">
        {/* Navbar */}
        <nav className="liquid-glass flex items-center justify-between rounded-xl px-4 py-2">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            VEX
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l}
                href="#"
                className="text-sm transition-colors hover:text-gray-300"
              >
                {l}
              </a>
            ))}
          </div>
          <Link
            href="/login"
            className="rounded-lg bg-white px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100"
          >
            Start a Chat
          </Link>
        </nav>

        {/* Hero content pinned to the bottom */}
        <div className="flex flex-1 flex-col justify-end pb-12 lg:grid lg:grid-cols-2 lg:items-end lg:pb-16">
          {/* Left */}
          <div>
            <AnimatedHeading
              text={"Shaping tomorrow\nwith vision and action."}
              className="mb-4 text-4xl font-normal md:text-5xl lg:text-6xl xl:text-7xl"
              style={{ letterSpacing: "-0.04em" }}
            />
            <FadeIn delay={800} className="mb-5">
              <p className="text-base text-gray-300 md:text-lg">
                We back visionaries and craft ventures that define what comes next.
              </p>
            </FadeIn>
            <FadeIn delay={1200}>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="rounded-lg bg-white px-8 py-3 font-medium text-black transition-colors hover:bg-gray-100"
                >
                  Start a Chat
                </Link>
                <Link
                  href="/login"
                  className="liquid-glass rounded-lg border border-white/20 px-8 py-3 font-medium text-white transition-colors hover:bg-white hover:text-black"
                >
                  Explore Now
                </Link>
              </div>
            </FadeIn>
          </div>

          {/* Right */}
          <div className="mt-8 flex items-end justify-start lg:mt-0 lg:justify-end">
            <FadeIn delay={1400}>
              <div className="liquid-glass rounded-xl border border-white/20 px-6 py-3">
                <span className="text-lg font-light md:text-xl lg:text-2xl">
                  Investing. Building. Advisory.
                </span>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </div>
  );
}
