"use client";

import { useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRef } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

const faqs = [
  {
    question: "What is Noeron?",
    answer:
      "Noeron is an open-source AI app builder that generates production-ready React code from natural language descriptions.",
  },
  {
    question: "How does AI code generation work?",
    answer:
      "We use GPT-4o, Claude 3.5, and Gemini 1.5 Pro to analyze your input and generate clean, production-ready React code with Tailwind CSS.",
  },
  {
    question: "Can I export the generated code?",
    answer:
      "Yes. All code is fully exportable as a complete React application, or deploy directly to Vercel or Netlify.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. Our free plan includes 50K tokens per month. Upgrade to Pro for 2M monthly tokens and additional features.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-white/[0.08] last:border-0">
      <button
        onClick={onClick}
        aria-expanded={isOpen}
        className="w-full py-5 flex items-center justify-between text-left group hover:bg-white/[0.02] transition-colors rounded-lg px-3 -mx-3"
      >
        <span className="text-base font-medium text-white pr-4 group-hover:text-orange-300 transition-colors">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0"
        >
          <ChevronDown
            className="w-5 h-5 text-white/50 group-hover:text-orange-400 transition-all"
            strokeWidth={2}
          />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-base text-white/60 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="faq" className="section-lg relative bg-black">
      <div className="container-modern">
        <div className="max-w-2xl mx-auto">
          {/* Section Header */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/80 mb-6">
              <Sparkles className="w-4 h-4 text-orange-400" />
              FAQ
            </span>
            <h2 className="text-headline text-white mb-5">
              Common questions, answered
            </h2>
            <p className="text-body text-white/60">
              Everything you need to know about Noeron.
            </p>
          </motion.div>

          {/* FAQ Items */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="card-elevated"
          >
            <div className="px-2">
              {faqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openIndex === index}
                  onClick={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
