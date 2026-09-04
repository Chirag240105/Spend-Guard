'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import LandingNavbar from './navbar';
import Hero from './hero';
import ProblemSection from './problem-section';
import SolutionSection from './solution-section';
import PolicyCompiler from './policy-compiler';
import DecisionEngine from './decision-engine';
import { SpendingSection, AuditSection } from './spending-audit';
import ArchitectureSection from './architecture-section';
import FeaturesSection from './features';
import PaymentSection from './payment-section';
import FinalCTA from './final-cta';
import LandingFooter from './footer';

export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  /* Intersection Observer wiring for .lp-reveal elements */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add('lp-visible');
        }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.lp-reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!pageRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-scroll-word]').forEach((word) => {
        gsap.fromTo(
          word,
          { opacity: 0.35 },
          {
            opacity: 1,
            color: 'var(--blue)',
            fontWeight: 800,
            ease: 'none',
            scrollTrigger: {
              trigger: word.closest('section'),
              start: 'top 82%',
              end: 'top 38%',
              scrub: true,
            },
          },
        );
      });
      gsap.utils.toArray<HTMLElement>('[data-scroll-stage]').forEach((stage) => {
        gsap.fromTo(
          stage,
          { opacity: 0.38, scale: 0.98 },
          {
            opacity: 1,
            scale: 1.025,
            color: 'var(--blue)',
            fontWeight: 800,
            ease: 'none',
            scrollTrigger: { trigger: stage, start: 'top 78%', end: 'bottom 45%', scrub: true },
          },
        );
      });
      gsap.utils.toArray<HTMLElement>('[data-decision-state]').forEach((card) => {
        gsap.fromTo(
          card,
          { opacity: 0.42, scale: 0.985 },
          {
            opacity: 1,
            scale: 1.015,
            ease: 'none',
            scrollTrigger: { trigger: card, start: 'top 78%', end: 'bottom 38%', scrub: true },
          },
        );
      });
      gsap.utils.toArray<HTMLElement>('[data-policy-highlight]').forEach((phrase, index) => {
        gsap.fromTo(
          phrase,
          { backgroundColor: 'transparent', color: '#cbd5e1' },
          {
            backgroundColor: 'rgba(37, 99, 235, .25)',
            color: '#bfdbfe',
            ease: 'none',
            scrollTrigger: {
              trigger: phrase.closest('section'),
              start: `${25 + index * 8}% 82%`,
              end: `${42 + index * 8}% 48%`,
              scrub: true,
            },
          },
        );
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef}>
      <LandingNavbar />
      <main id="main-content">
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <PolicyCompiler />
        <DecisionEngine />
        <SpendingSection />
        <AuditSection />
        <ArchitectureSection />
        <FeaturesSection />
        <PaymentSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
