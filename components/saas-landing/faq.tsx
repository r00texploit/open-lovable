"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion, Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is Noeron?",
    answer: "Noeron is an open-source AI app builder that generates production-ready React code from natural language descriptions.",
  },
  {
    question: "How does AI code generation work?",
    answer: "We use GPT-4o, Claude 3.5, and Gemini 1.5 Pro to analyze your input and generate clean, production-ready React code with Tailwind CSS.",
  },
  {
    question: "Can I export the generated code?",
    answer: "Yes. All code is fully exportable as a complete React application, or deploy directly to Vercel or Netlify.",
  },
  {
    question: "Is there a free plan?",
    answer: "Yes. Our free plan includes 50K tokens per month. Upgrade to Pro for 2M monthly tokens and additional features.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function FAQItem({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-white/[0.08] last:border-0">
      <button
        onClick={onClick}
        className="w-full py-4 flex items-center justify-between text-left group hover:bg-white/[0.02] transition-colors rounded-lg px-2 -mx-2"
      >
        <span className="text-sm font-semibold text-white pr-4 group-hover:text-violet-300 transition-colors">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-white/70 group-hover:text-violet-400 group-hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] transition-all" strokeWidth={2.5} />
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
            <p className="pb-4 text-sm text-white/60 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 relative bg-[#0A0A0B]">
      <div className="max-w-2xl mx-auto px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            FAQ
          </motion.h2>
          <motion.p variants={itemVariants} className="text-white/60">
            Common questions, answered.
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="bg-white/[0.02] rounded-xl border border-white/[0.08]"
        >
          <div className="px-5">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-white/60">
            Have more questions? <a href="mailto:support@noeron.ai" className="text-violet-400 hover:underline font-medium">Get in touch</a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
